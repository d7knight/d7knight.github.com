<?PHP
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
echo json_encode(array("apples" => true, "bananas" => null));
?>