<?php

/**
 * File to handle all API requests
 * Accepts GET and POST
 *
 * Each request will be identified by TAG
 * Response will be JSON data
 *
 * /**
 * check for POST request
 */
if (isset($_POST['tag']) && $_POST['tag'] != '') {
    // get tag
    $tag = $_POST['tag'];

    // include db handler
    require_once dirname(__FILE__) . '/include/DB_Functions.php';
    $db = new DB_Functions();

    // response Array
    $response = array("tag" => $tag, "error" => FALSE);

    // check for tag type
    if ($tag == 'login') {
        // Request type is check Login
        $email = $_POST['email'];
        $password = $_POST['password'];

        // check for user
        $user = $db->getUserByEmailAndPassword($email, $password);
        if ($user != false) {
            // user found
            $response["error"] = FALSE;
            $response["uid"] = $user["unique_id"];
            $response["user"]["name"] = $user["name"];
            $response["user"]["email"] = $user["email"];
            $response["user"]["created_at"] = $user["created_at"];
            $response["user"]["updated_at"] = $user["updated_at"];
            echo json_encode($response);
        } else {
            // user not found
            // echo json with error = 1
            $response["error"] = TRUE;
            $response["error_msg"] = "Incorrect email or password!";
            echo json_encode($response);
        }
    } else if ($tag == 'register') {
        // Request type is Register new user
        $name = $_POST['name'];
        $email = $_POST['email'];
        $password = $_POST['password'];


        // check if user is already existed
        if ($db->isUserExisted($email)) {
            // user is already existed - error response
            $response["error"] = TRUE;
            $response["error_msg"] = "User already existed";
            echo json_encode($response);
        } else {
            // store user
            $user = $db->storeUser($name, $email, $password);
            if ($user) {
                // user stored successfully
                $response["error"] = FALSE;
                $response["uid"] = $user["unique_id"];
                $response["user"]["name"] = $user["name"];
                $response["user"]["email"] = $user["email"];
                $response["user"]["created_at"] = $user["created_at"];
                $response["user"]["updated_at"] = $user["updated_at"];
                echo json_encode($response);
            } else {
                // user failed to store
                $response["error"] = TRUE;
                $response["error_msg"] = "Error occured in Registartion";
                echo json_encode($response);
            }
        }
    } else if ($tag == 'get_fuels') {
        // Request type is check Login
        $id = $_POST['id'];


        // check for user
        $response = $db->get_fuels_for_gas_station($id);
        if (!$response['error']) {

            echo json_encode($response);
        } else {

            echo json_encode($response);
        }
    } else if ($tag == 'get_station') {
        // Request type is check Login
        $id = $_POST['id'];


        // check for user
        $response = $db->get_gas_station($id);
        if (!$response['error']) {

            echo json_encode($response);
        } else {

            echo json_encode($response);
        }
    } else if ($tag == 'store_fuel') {
        // Request type is check Login
        $id = $_POST['id'];
        $grade = $_POST['grade'];
        $price = $_POST['price'];
        $price_updated = $_POST['price_updated'];

        // check for user
        $response = $db->store_fuel($id, $grade, $price, $price_updated);
        if (!$response['error']) {

            echo json_encode($response);
        } else {

            echo json_encode($response);
        }
    } else if ($tag == 'store_station') {
        // Request type is check Login
        $id = $_POST['id'];
        $lat = $_POST['lat'];
        $lon = $_POST['lon'];
        $name = $_POST['name'];
        $phone = $_POST['phone'];
        $address = $_POST['address'];
        $area = $_POST['area'];

        // check for user
        $response = $db->store_gas_station($id, $lat, $lon, $name, $phone, $address, $area);
        if (!$response['error']) {

            echo json_encode($response);
        } else {

            echo json_encode($response);
        }
    } else if ($tag == 'get_stations_by_distance_then_price') {
        // Request type is check Login
        $lat = $_POST['lat'];
        $lon = $_POST['lon'];
        $radius = $_POST['radius'];
        $grade = $_POST['grade'];



        // check for user
        $response = $db->get_stations_by_distance_then_price($lat, $lon, $radius, $grade);
        if (!$response['error']) {

            echo json_encode($response);
        } else {

            echo json_encode($response);
        }
    } else {
        // user failed to store
        $response["error"] = TRUE;
        $response["error_msg"] = "Unknown 'tag' value. It should be either 'login','register','get_station','get_fuels','store_station','store_fuel','get_stations_by_distance_then_price'";
        echo json_encode($response);
    }
} else {
    $response["error"] = TRUE;
    $response["error_msg"] = "Required parameter 'tag' is missing!";
    echo json_encode($response);
}

?>
