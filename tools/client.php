<?php
header('content-type: application/json; charset=utf-8');

$data = json_encode($_SERVER['REMOTE_ADDR']);
echo $_GET['callback'] . '(' . $data . ');';
?>