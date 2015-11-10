<?php
header("Access-Control-Allow-Origin: *");
require dirname(__FILE__) . '/scraper.php';

$scraper = new Scraper();
$scraper->updatedb("gasbuddy");
