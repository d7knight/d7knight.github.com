<?php
header("Access-Control-Allow-Origin: *");
require dirname(__FILE__) . '/scraper.php';
$action = $_GET['action'];
$ids = $_GET['ids'];
$site = $_GET['site'];
$scraper = new Scraper();

if ($action == 'updatedb' && $site != null) {

    $scraper->updatedb($site);
}

if ($action == 'test_proxies') {

    $scraper->testProxies();
}


if (empty($ids)) return json_encode([]);
$ids = explode(',', $ids);
$result = [];
foreach ($ids as $id) {

        if (strval($id) > 0 && $action == 'station') {
            $result[] = $scraper->getStationInfo(strval($id));
        } elseif ( $action == 'zip') {
            $result = $scraper->getStationIDsNearLocation(strval($id));
        }


}


echo json_encode($result);




