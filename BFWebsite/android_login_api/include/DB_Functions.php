<?php

class DB_Functions
{

    private $db;

    //put your code here
    // constructor
    function __construct()
    {
        require_once dirname(__FILE__) . '/DB_Connect.php';
        // connecting to database
        $this->db = new DB_Connect();
        $this->db->connect();
    }

    // destructor
    function __destruct()
    {

    }

    /**
     * Storing new user
     * returns user details
     */
    public function storeUser($name, $email, $password)
    {
        $uuid = uniqid('', true);
        $hash = $this->hashSSHA($password);
        $encrypted_password = $hash["encrypted"]; // encrypted password
        $salt = $hash["salt"]; // salt
        $result = mysql_query("INSERT INTO users(unique_id, name, email, encrypted_password, salt, created_at) VALUES('$uuid', '$name', '$email', '$encrypted_password', '$salt', NOW())");
        // check for successful store
        if ($result) {
            // get user details 
            $uid = mysql_insert_id(); // last inserted id
            $result = mysql_query("SELECT * FROM users WHERE uid = $uid");
            // return user details
            return mysql_fetch_array($result);
        } else {
            return false;
        }
    }

    /**
     * Get user by email and password
     */
    public function getUserByEmailAndPassword($email, $password)
    {
        $result = mysql_query("SELECT * FROM users WHERE email = '$email'") or die(mysql_error());
        // check for result 
        $no_of_rows = mysql_num_rows($result);
        if ($no_of_rows > 0) {
            $result = mysql_fetch_array($result);
            $salt = $result['salt'];
            $encrypted_password = $result['encrypted_password'];
            $hash = $this->checkhashSSHA($salt, $password);
            // check for password equality
            if ($encrypted_password == $hash) {
                // user authentication details are correct
                return $result;
            }
        } else {
            // user not found
            return false;
        }
    }


    /**
     * Storing new user
     * returns user details
     */
    public function store_gas_station($id, $lat, $lon, $name, $phone, $address, $area)
    {
        $query = sprintf("INSERT INTO stations SET id='%s', lat='%s', lon='%s', name='%s', phone='%s', address='%s', area='%s', created_at=NOW() ON DUPLICATE KEY UPDATE lat='%s', lon='%s', name='%s', phone='%s', address='%s', area='%s',updated_at=NOW()",
            mysql_real_escape_string($id),
            mysql_real_escape_string($lat),
            mysql_real_escape_string($lon),
            mysql_real_escape_string($name),
            mysql_real_escape_string($phone),
            mysql_real_escape_string($address),
            mysql_real_escape_string($area),
            mysql_real_escape_string($lat),
            mysql_real_escape_string($lon),
            mysql_real_escape_string($name),
            mysql_real_escape_string($phone),
            mysql_real_escape_string($address),
            mysql_real_escape_string($area));

        $result = mysql_query($query);

        $result['error_msg']=mysql_errno();
        if ($result) {


            return $this->get_gas_station($id);
        } else {
            $ret['error']=true;
            $ret['error_msg']=mysql_error();
            $ret['result']=[];
            $ret['result_set_size']=0;
            return $ret;
        }
    }

    /**
     * Storing new user
     * returns user details
     */
    public function store_fuel($gs_id, $grade, $price, $price_updated)
    {


        $query = sprintf("SELECT price FROM fuels WHERE gs_id = '%s' and grade='%s'",
        mysql_real_escape_string($gs_id),
        mysql_real_escape_string($grade));
        $result = mysql_query($query);
        $no_of_rows = mysql_num_rows($result);
        if($no_of_rows>0){
          $last_price=mysql_fetch_assoc($result)['price'];
            $last_last_price=mysql_fetch_assoc($result)['last_price'];
            if(floatval($price)==floatval($last_price) && !is_null($last_last_price))$last_price=$last_last_price;
            //this stmt above makes sure last_price is the last different price

        $query = sprintf("INSERT INTO fuels SET gs_id='%s',grade='%s',price='%s',price_updated='%s',created_at=NOW() on duplicate key UPDATE price='%s',last_price='%s', price_updated='%s',updated_at=NOW() ",
            mysql_real_escape_string($gs_id),
            mysql_real_escape_string($grade),
            mysql_real_escape_string($price),
            mysql_real_escape_string($price_updated),
            mysql_real_escape_string($price),
            mysql_real_escape_string($last_price),
            mysql_real_escape_string($price_updated));

        }
        else
        {
            $query = sprintf("INSERT INTO fuels SET gs_id='%s',grade='%s',price='%s',price_updated='%s',created_at=NOW() ",
            mysql_real_escape_string($gs_id),
            mysql_real_escape_string($grade),
            mysql_real_escape_string($price),
            mysql_real_escape_string($price_updated));

        }



        $result = mysql_query($query);

        if ($result) {


            return $this->get_fuel($gs_id,$grade) ;
        } else {
            $ret['error']=true;
            $ret['error_msg']=mysql_error();
            $ret['result']=[];
            $ret['result_set_size']=0;
            return $ret;
        }
    }
    private  function get_fuel($gs_id, $grade){
        $query = sprintf("SELECT * FROM fuels WHERE gs_id = '%s' and grade='%s'",
            mysql_real_escape_string($gs_id),
            mysql_real_escape_string($grade));
        $result = mysql_query($query);
        return $this->format_return($result);
    }
    /**
     * Get user by email and password
     */
    public function get_gas_station($sid)
    {
        $query = sprintf("SELECT * FROM stations WHERE id = '%s' ",
            mysql_real_escape_string($sid));

        $result = mysql_query($query);




       return $this->format_return($result);
    }

    public function get_fuels_for_gas_station($sid)
    {
        $query = sprintf("SELECT * FROM fuels WHERE gs_id = '%s' ",
            mysql_real_escape_string($sid));
        $result = mysql_query($query);



        return $this->format_return($result);
    }

    public function get_stations_by_distance_then_price($lat, $lon, $radius, $grade)
    {

        $query = sprintf("SELECT * , ( 3959 * ACOS( COS( RADIANS(  '%s' ) ) * COS( RADIANS( lat ) ) * COS( RADIANS( lon ) - RADIANS(  '%s' ) ) + SIN( RADIANS(  '%s' ) ) * SIN( RADIANS( lat ) ) ) ) AS distance
FROM stations t1
INNER JOIN fuels t2 ON ( t2.gs_id = t1.id )
WHERE grade =  '%s'
HAVING distance <  '%s'
ORDER BY distance,price ASC
LIMIT 0,30",
            mysql_real_escape_string($lat),
            mysql_real_escape_string($lon),
            mysql_real_escape_string($lat),
            mysql_real_escape_string($grade),
            mysql_real_escape_string($radius)
        );

        $result = mysql_query($query);

      return   $this->format_return($result);
    }

    public function get_most_recent_created_station()
    {
        $query= "SELECT * FROM stations ORDER BY created_at desc limit 1";
        $result = mysql_query($query);


       return $this->format_return($result);

    }
    private function format_return($result){
        if ($result) {
            while ($row = mysql_fetch_assoc($result)) {
                $table[] = $row;
            }
            $ret['error']=false;
            $ret['result_set_size']=mysql_num_rows($result);
            $ret['result']=$table;
            $ret['error_msg']="";
            return $ret;
        } else {
            $ret['result']=[];
            $ret['result_set_size']=0;
            $ret['error']=true;
            $ret['error_msg']=mysql_error();
            return $ret;
        }

    }
    public function get_most_recent_updated_station()
    {$query= "SELECT id FROM stations  ORDER BY updated_at DESC limit 1 ";
        $result = mysql_query($query);

     return        $this->format_return($result);


    }


    public function get_oldest_updated_station_list()
    {$query= "SELECT * FROM stations ORDER BY updated_at ASC limit 1, 10000 ";
    $result = mysql_query($query);
        return $this->format_return($result);


    }


    /**
     * Check user is existed or not
     */
    public function isUserExisted($email)
    {
        $result = mysql_query("SELECT email from users WHERE email = '$email'");
        $no_of_rows = mysql_num_rows($result);
        if ($no_of_rows > 0) {
            // user existed 
            return true;
        } else {
            // user not existed
            return false;
        }
    }

    /**
     * Encrypting password
     * @param password
     * returns salt and encrypted password
     */
    public function hashSSHA($password)
    {

        $salt = sha1(rand());
        $salt = substr($salt, 0, 10);
        $encrypted = base64_encode(sha1($password . $salt, true) . $salt);
        $hash = array("salt" => $salt, "encrypted" => $encrypted);
        return $hash;
    }

    /**
     * Decrypting password
     * @param salt , password
     * returns hash string
     */
    public function checkhashSSHA($salt, $password)
    {

        $hash = base64_encode(sha1($password . $salt, true) . $salt);

        return $hash;
    }

}

?>
