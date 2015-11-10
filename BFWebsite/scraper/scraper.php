<?php
header("Access-Control-Allow-Origin: *");
require 'goutte.phar';


class Scraper
{
    protected $process_id;
    protected $urls;
    protected $time_start;
    protected $current_proxy;
    protected $current_proxy_index;
    private $proxies = array(
        array('http' => '50.57.131.89:3128'),
        // array('http' => '71.43.180.203:8080'),
        array('http' => '209.66.192.149:8080'),
        array('http' => '196.41.9.169:8585')
        // array('http' => '46.40.38.110:8080'),
        // array('http' => '89.46.101.122:8089'),
        // array('http' => '92.255.197.224:1080')
        // array('http' => '187.217.191.162:3128'),
        //array('http' => '37.239.46.50:80') slow get status 503


    );
    private $quota_used = 0;

    public function __construct()
        {
            $this->time_start = $this->microtime_float();
        $this->process_id = rand(1, 10000000);
        date_default_timezone_set('America/Toronto');
    }
    private function time_taken(){
    return  ($this->microtime_float() - $this->time_start);
}

    protected function trimAndExplode($input)
    {
        return preg_split('/\s+/', trim($input));
    }

    protected function parsePriceInfo($fields)
    {
        $fields = $this->trimAndExplode($fields[0]);
        $result['grade'] = $this->arrayValue($fields, 0);
        $result['price'] = $this->arrayValue($fields, 2);
        $result['timestamp'] = $this->arrayValue($fields, 3);
        $result['user'] = $this->arrayValue($fields, 5);
        return $result;
    }

    protected function arrayValue(array $array, $key, $default = null)
    {
        return array_key_exists($key, $array) ? $array[$key] : $default;
    }

    private function testProxy($proxy)
    {  $time_start = $this->microtime_float();
        $client = new Goutte\Client();

        $client
            ->getClient()
            ->setDefaultOption('proxy', $proxy);
        $id = 533;
        $url = 'http://www.gasbuddy.com/Station/' . $id;

        $client->request('GET', $url);

        $status_code = $client->getResponse()->getStatus();

        if ($status_code != 200) {

            $msg = " proxy" . json_encode($proxy) . " no good" . "\n";

        } else {
            $msg = " proxy" . json_encode($proxy) . " good took " . ($this->microtime_float() - $time_start) . " seconds\n";

        }
        file_put_contents('update_log', $msg, FILE_APPEND);
        echo $msg;

    }

    public function testProxies()
    {
        $proxies = $this->proxies;

        for ($i = 0; $i < count($proxies); $i++) {
            $str = "update process id= $this->process_id Testing " . json_encode($proxies[$i]) . " i=$i \n";
            file_put_contents('update_log', $str, FILE_APPEND);


            $ret = $this->getStationInfo(rand(3, 6), $proxies[$i]);
            if ($ret != false) $str = "update process id= $this->process_id Passed " . json_encode($proxies[$i]) . " i=$i \n";
            else $str = "update process id= $this->process_id Failed " . json_encode($proxies[$i]) . " i=$i \n";

            file_put_contents('update_log', $str, FILE_APPEND);
        }


    }

    private function microtime_float()
    {
        list($usec, $sec) = explode(" ", microtime());
        return ((float)$usec + (float)$sec);
    }

    public function getStationInfo($id, $proxy)
    {
        try {
            $time_start = $this->microtime_float();
            //if(empty($proxy)) $proxy =  $this->proxies[array_rand($this->proxies)];
            // echo $id;
            $client = new Goutte\Client();

            //this proxy ['http' => '167.114.169.129:8118'] crashes my script if used need to figure out how to stop proxies
            //like this from crashing my script get instant server error 500 when used

            //file_put_contents('update_log', "Using proxy to scrape " . json_encode($proxy) . "\n", FILE_APPEND);
            // echo "Using proxy to scrape " . json_encode($proxy) . "\n";

           // $client
            //    ->getClient()
            //    ->setDefaultOption('proxy', $proxy);
            // $client
            //     ->getClient()
            //     ->setDefaultOption( 'debug' , true);
            $url = 'http://www.gasbuddy.com/Station/' . $id;
            $crawler = $client->request('GET', $url);
            $status_code = $client->getResponse()->getStatus();
            $str = "update process id= $this->process_id For station $id  Proxy " . json_encode($proxy) . " Status Code $status_code took " . ($this->microtime_float() - $time_start) . " seconds total time so far ".$this->time_taken() ." seconds so far\n";

            file_put_contents('update_log', $str, FILE_APPEND);
            echo $str;

            if ($status_code != 200) {

                return;
            }


            //die ($crawler->html());

            //file_put_contents('last_page_before_crash', "Status Code $status_code" . "\n", FILE_TEXT);


            $station = [];
            $station['id'] = $id;
            $station['url'] = $url;
            $station['name'] = $crawler->filter('h2.station-name')->text();
            $station['phone'] = $crawler->filter('div.station-phone')->text();
            $station['address'] = $crawler->filter('div.station-address')->text();
            $station['area'] = $crawler->filter('div.station-area')->text();
            $xpaths['regular'] = '//*[@id="prices"]/div[1]/div';
            $xpaths['midgrade'] = '//*[@id="prices"]/div[2]/div';
            $xpaths['premium'] = '//*[@id="prices"]/div[3]/div';
            $xpaths['diesel'] = '//*[@id="prices"]/div[4]/div';

            foreach ($xpaths as $xpath) {
                $result = $this->parsePriceInfo(
                    $crawler->filterXPath($xpath)->each(
                        function ($node, $i) {
                            return $node->text();
                        }
                    )
                );
                $station['fuels'][] = $result;
            }
            return $station;
        } catch (Exception $e) {
            return false;
        }
    }

    public function getStationIDsNearLocation($location)
    {
        $client = new Goutte\Client();
        $url = 'http://www.gasbuddy.com/?search=' . $location;
        $crawler = $client->request('GET', $url);

        $result = $crawler->filter('tbody#prices-table > tr > td > a')->each(function ($node, $i) {
            $url = $node->attr('href');
            return intval(substr($url, strrpos($url, '/') + 1));
        });

        return $result;
    }


    public function updatedb($site)
    {

        //echo "update db called" . "\n";


        $upOne = dirname(__FILE__) . '/..';
        //echo $upOne . "\n";
        $DB_functions = $upOne . '/android_login_api/include/DB_Functions.php';
        //echo $DB_functions . "\n";
        if (file_exists($DB_functions)) {
            include($DB_functions);
            //   echo "include $DB_functions success" . "\n";
        } else {
            $str="include $DB_functions failure" . "\n";
            file_put_contents('update_log', $str, FILE_APPEND);
            die($str);
        }


        //echo "b4 db constructed" . "\n";
        if (class_exists('DB_Functions', false)) {

            // echo "DB_Functions class found" . "\n";
            $db = new DB_Functions();


        } else {
            $str="DB_Functions class not found" . "\n";
            file_put_contents('update_log', $str, FILE_APPEND);
            echo $str;
            return;
        }

        if ($site == "msn_autos") {
            $url = "http://fuel-finder.autos.ca.msn.com/Home/LoadStations";

            try {
                /** @var GuzzleHttp\Client $guzzle */
                $client = new Goutte\Client();
                $parameters = array('search' => 'n2g1r6', 'mode' => 'Standard', 'showSponsors' => 'False');

                $crawler = $client->request('POST', $url, array(), array(), array('HTTP_CONTENT_TYPE' => 'application/json', 'HTTP_DATA_TYPE' => 'html'), json_encode($parameters));


                $crawler->filter('#stationListTable > tr ')->each(function ($node, $i) {


                    $xpaths = [
                        '//a[1]', '//span[1]', '//span[2]', '//span[3]', '//span[4]', '//span[5]', '//span[6]', '//span[7]',
                        '//span[8]', '//span[9]', '//span[10]', '//span[11]'
                    ];
                    $keys = [
                        'name', 'address', 'distance', 'distance_units', 'regular_price', 'regular_updated', 'plus_price', 'plus_updated', 'premium_price', 'premium_updated',
                        'diesel_price', 'diesel_updated'
                    ];
                    $stations = [];
                    foreach ($xpaths as $i => $xpath) {
                        $stations[$keys[$i]] = $node->filterXPath($xpath)->text();
                    }
                    $stations[$keys[2]] = $this->trimAndExplode($stations[$keys[2]]);
                    echo json_encode($stations);

                });


            } catch (Exception $e) {
                echo "ERROR *************** Exception thrown *******************: " . $e->getMessage();
                return;
            }

        } else if ($site == "gasbuddy") {

            $id = rand(1,100000);

            $plan = date(DATE_RFC2822) . "  " . "Update Script Initializing update process id= $this->process_id time taken so far ".$this->time_taken()." seconds " . "\n";
            echo $plan;
            $stations_found=0;
            file_put_contents('update_log', $plan, FILE_APPEND);
            //cut it off after 10min
            while (true) {

                while (!$db->get_gas_station($id)['error']&&
                    $db->get_gas_station($id)['result_set_size']==1){
                    $id++;
                }


                $station = $this->getStationInfo($id, null);
                if ($station == false || !(array_key_exists('id', $station)
                        && array_key_exists('name', $station)
                        && array_key_exists('phone', $station)
                        && array_key_exists('address', $station)
                        && array_key_exists('area', $station))
                ) {
                    $current = date(DATE_RFC2822) . "  " . " update process id= $this->process_id  time taken so far ".$this->time_taken()." skipped station $id due to bad gasbuddy response likely station doesn't exist" . "\n";
                    file_put_contents('update_log', $current, FILE_APPEND);
                    $id++;
                    continue;

                }

                $result = $db->get_gas_station($id);

                //check if not in db
                if (!$result['error'] && $result['result_set_size'] == 0) {
                    // not in db have to geocode address


                    //only need to geocode if the station is not in the database
                    $full_address = $station['address'] . " " . $station['area'];

                    $current = date(DATE_RFC2822) . "  " . " update process id= $this->process_id time taken so far ".$this->time_taken()." seconds attempting to Geocode Address $full_address" . "\n";
                    file_put_contents('update_log', $current, FILE_APPEND);
                   $location_data = $this->geocode($full_address);
                    if ($location_data['status'] == "OVER_QUERY_LIMIT") {


                        $current = date(DATE_RFC2822) . "  " . " update process id= $this->process_id time taken so far ".$this->time_taken()." ENTERED 1000 UPDATE FOR LOOP FOR WHEN QUOTA EXCEEDED" . "\n";
                        file_put_contents('update_log', $current, FILE_APPEND);
                        if(false && count($this->proxies)>0) {
                         //   echo "got here err \n";
                            if(is_null($this->current_proxy)){
                                $this->current_proxy=$this->proxies[0];
                                $this->current_proxy_index=0;
                                //echo "got here \n";
                                continue;
                            }

                            if ($this->current_proxy_index != count($this->proxies) - 1) {
                                $this->current_proxy_index++;
                                $this->current_proxy = $this->proxies[$this->current_proxy_index];
                                continue;

                                //this will try geocoding the same address with a different proxy perhaps with quota still there
                            }

                        }
                        //limit exceeded going to focus on updating station prices in DB instead of searching for new stations
                        $old_updated_stations=$db->get_oldest_updated_station_list();

                        if($old_updated_stations['error']){

                            $current = date(DATE_RFC2822) . "  " . " update process id= $this->process_id time taken so far ".$this->time_taken()." ERROR: " . $old_updated_stations['error_msg'] . "stopping script \n";
                            file_put_contents('update_log', $current, FILE_APPEND);
                            die($current);

                        }

                        foreach($old_updated_stations['result'] as $old_station){
                                //scraper algorithm
                                $updated_station = $this->getStationInfo($id, null);
                                //need this check encase it still fails for various reasons
                                if ($station == false || !(array_key_exists('id', $station)
                                        && array_key_exists('name', $station)
                                        && array_key_exists('phone', $station)
                                        && array_key_exists('address', $station)
                                        && array_key_exists('area', $station))
                                ) {
                                    $current = date(DATE_RFC2822) . "  " . " update process id= $this->process_id time taken so far ".$this->time_taken()." INSIDE 1000 UPDATE FOR LOOP FOR WHEN QUOTA EXCEEDED skipped station $id  due to bad gasbuddy response likely station doesn't exist" . "\n";
                                    file_put_contents('update_log', $current, FILE_APPEND);
                                    $id++;
                                    continue;

                                }
                                $updated_station['lat']=$old_station['lat'];
                                $updated_station['lon']=$old_station['lon'];

                                $this->insertStationData($updated_station,$db);

                            }



                            $current = date(DATE_RFC2822) . "  " . " update process id= $this->process_id Successfully did 1000 updates in ".$this->time_taken()." seconds to station entries in the Database" . "\n";


                            file_put_contents('update_log', $current, FILE_APPEND);
                            return;

                        }
                        else if($location_data['status'] != "OK"){

                            $error = "update process id= $this->process_id time taken so far ".$this->time_taken()." ERROR: received status code ".$location_data['status']." something went terribly wrong with geocoding an address skipping this station " . "\n";
                            file_put_contents('update_log', $error, FILE_APPEND);
                            $id++;
                            continue;

                        }
                        $station['lat'] = $location_data['lat'];
                        $station['lon'] = $location_data['lon'];

                    } else {
                        // $current="found geocode in cache/db skipping geocode request to save quota" . "\n";
                        //  echo $current;
                        //  file_put_contents('update_log', $current , FILE_APPEND);
                        $station['lat'] = $result['result'][0]['lat'];
                        $station['lon'] = $result['result'][0]['lon'];


                    }
                    $stations_found++;
                    $this->insertStationData($station,$db);

                    $current = date(DATE_RFC2822) . "  " . " update process id= $this->process_id Successfully inserted station $id found and inserted $stations_found stations into Databases so far with running time at ".$this->time_taken()." seconds" . "\n";


                    file_put_contents('update_log', $current, FILE_APPEND);
                    $id++;
                    if($this->time_taken()>3600){
                        $current = date(DATE_RFC2822) . "  " . "update process id= $this->process_id EXCEEDED 10 MINUTES STOPPING SCRIPT ...  used $this->quota_used quota for google maps geocoder service" . "\n";

                        //echo $current;

                        file_put_contents('update_log', $current, FILE_APPEND);
                        die($current);

                    }

                }



            }


        }

//this function inserts the json data into the respective tables
private function insertStationData($data,$db){
    //providing some input verification before insert into db
    $id = $data['id'];
    $lat = $data['lat'];
    $lon = $data['lon'];
    $name = $data['name'];
    $phone = $data['phone'];
    $address = $data['address'];
    $area = $data['area'];
    if (empty($id)) {
        $str="update process id= $this->process_id before stations db insertion  id is null or not an int id=$id";
           file_put_contents('update_log', $str, FILE_APPEND);
        die($str);

    }
    if (empty($name)) {
        $str="update process id= $this->process_id before stations db insertion name is null or not a string name=$name";
          file_put_contents('update_log', $str, FILE_APPEND);
        die($str);
    }
    if (empty($phone)) {
        //this is ok
    }
    if (empty($address)) {
        $str="update process id= $this->process_id before stations db insertion address is null or not a string address=$address";
           file_put_contents('update_log', $str, FILE_APPEND);
        die($str);
    }
    if (empty($area)) {
        $str="update process id= $this->process_id before stations db insertion  area is null or not a string area=$area";
      file_put_contents('update_log', $str, FILE_APPEND);
        die($str);
    }
    if (empty($lat)) {
        $str="update process id= $this->process_id before stations db insertion  lat is null or not a float: lat=$lat";
      file_put_contents('update_log', $str, FILE_APPEND);
        die($str);
    }
    if (empty($lon)) {
        $str="update process id= $this->process_id before stations db insertion  lon is null or not a float: lon=$lon";
  file_put_contents('update_log', $str, FILE_APPEND);
        die($str);
    }

    //$current = "update process id= $this->process_id Data inserting in station db : " . json_encode($data) . "\n";
    // echo $current;
    //file_put_contents('update_log', "Station Data: " .$current , FILE_APPEND);


    $result = $db->store_gas_station($id, $lat, $lon, $name, $phone, $address, $area);

    if ($result['error']) {
        $str=$result['error_msg'];
        file_put_contents('update_log', $str, FILE_APPEND);
        die($str);
    }

    foreach ($data['fuels'] as $fuel) {
        $grade = $fuel['grade'];
        $price = $fuel['price'];
        $price_updated = $fuel['timestamp'];

        //providing some error checking for my scrappre algorithm

        if (empty($id)) {
            continue;
        }
        if (empty($grade)) {
            continue;

        }
        if (empty($price) || $price == "--") {
            continue;
        }
        if (empty($price_updated)) {
        }

        $result = $db->store_fuel($id, $grade, $price, $price_updated);
        if ($result['error']) {
            $str=$result['error_msg'];
            file_put_contents('update_log', $str, FILE_APPEND);

            die($str);
        }
        //$data = ['id' => $station['id'], 'grade' => $fuel['grade'], 'price' => $fuel['price'], 'price_updated' => $fuel['timestamp']];


        //  $current .= date(DATE_RFC2822) . "  " . "Data inserted in Fuels DB" . json_encode($data) . "\n";
    }

}
//function to geocode address, it will return false if unable to geocode address
        private
        function geocode($address)
        {

/* usleep(250000);//need to sleep at least 200 milli seconds so that I don't go over the simultaneous request limit
            // url encode the address
            try {
                $address = urlencode($address);
                $client = new Goutte\Client();
                $url = "https://maps.google.com/maps/api/geocode/json?sensor=false&address=Kitchener";
              //  if (!is_null($this->current_proxy)) $client->getClient()->setDefaultOption('proxy', $this->current_proxy);
                echo "here \n";
                $crawler= $client->request('GET', $url);
                echo "here \n";
                $response=$client->getResponse();

                $status_code =$response->getStatus();


                if ($status_code != 200) {
                    $str = 'could not connect to googleapis.com/maps/api';
                    file_put_contents('update_log', $str, FILE_APPEND);
                    die($str);
                }
                echo "b4 here \n";
                $resp = $crawler->text();
                echo "here \n";
                echo json_encode($resp);
            }
            catch( Exception  $e){
                $str= "Exception Error: " .$e->getMessage() . " \n";
                file_put_contents('update_log', $str, FILE_APPEND);
                die($str);
            }
            die("test");


            if ($resp['status'] == 'OK') {

                // get the important data
                $lati = $resp['results'][0]['geometry']['location']['lat'];
                $longi = $resp['results'][0]['geometry']['location']['lng'];
                $formatted_address = $resp['results'][0]['formatted_address'];

                // verify if data is complete
                if ($lati && $longi && $formatted_address) {

                    $this->quota_used++;
                    return array('lat' => $lati, 'lon' => $longi, 'status' => $resp['status']);

                } else {
                    return false;
                }

            } else {
                return array('status' => $resp['status']);
            }
        }*/
            usleep(250000);//need to sleep at least 200 milli seconds so that I don't go over the simultaneous request limit
            // url encode the address
            $address = urlencode($address);

            // google map geocode api url
            $url = "https://maps.google.com/maps/api/geocode/json?sensor=false&address={$address}";

            // get the json response
            $resp_json = file_get_contents($url);
            // decode the json
            $resp = json_decode($resp_json, true);
            //die("geocode called" . $resp_json);
            // response status will be 'OK', if able to geocode given address

            if ($resp['status'] == 'OK') {

                // get the important data
                $lati = $resp['results'][0]['geometry']['location']['lat'];
                $longi = $resp['results'][0]['geometry']['location']['lng'];
                $formatted_address = $resp['results'][0]['formatted_address'];

                // verify if data is complete
                if ($lati && $longi && $formatted_address) {

                    $this->quota_used++;
                    return array('lat' => $lati, 'lon' => $longi, 'status' => $resp['status']);

                } else {
                    return false;
                }

            } else {
                return array('status' => $resp['status']);
            }
        }

}





//Sample format of data that my algorithm needs to scrape
//node is a new crawler instance


/*
 *  <tr>
        <td class="col1 whiteBackground" id='NOCO'>
            <div id="stationListId_2" class="marker">2</div>
            <a href="#" onmouseout="highlightPin('2',false)"  onmouseover="highlightPin('2',true)" onclick="displayDetail('2')">NOCO</a>
            <br />
            <span class="address">244 MARGARET AVE,</span>
        </td>
        <td>
            <span class="price">
                1.07
            </span>
            <span class="date">km</span>
        </td>
        <td>
            <span class="price">1.09</span>
            <span class="date">2015-05-30</span>
        </td>
        <td>
            <span class="price">1.17</span>
            <span class="date">2015-05-30</span>
        </td>
        <td>
            <span class="price">1.23</span>
            <span class="date">2015-05-30</span>
        </td>
        <td>
            <span class="price">1.13</span>
            <span class="date">2015-05-30</span>
        </td>
    </tr>
 */
