<?php

// Test the exact CRC16 implementation from the reference
function ConvertCRC16($str) {
    function charCodeAt($str, $i) {
        return ord(substr($str, $i, 1));
    }
    $crc = 0xFFFF;
    $strlen = strlen($str);
    for($c = 0; $c < $strlen; $c++) {
        $crc ^= charCodeAt($str, $c) << 8;
        for($i = 0; $i < 8; $i++) {
            if($crc & 0x8000) {
                $crc = ($crc << 1) ^ 0x1021;
            } else {
                $crc = $crc << 1;
            }
        }
    }
    $hex = $crc & 0xFFFF;
    $hex = strtoupper(dechex($hex));
    if (strlen($hex) == 3) $hex = "0".$hex;
    return $hex;
}

// Test QRIS from reference
$testQRIS = "00020101021126570011ID.DANA.WWW011893600915302259148102090225914810303UMI51440014ID.CO.QRIS.WWW0215ID10200176114730303UMI5204581253033605802ID5922Warung Sayur Bu Sugeng6010Kab. Demak610559567630458C7";

echo "Original QRIS: $testQRIS\n";
echo "Length: " . strlen($testQRIS) . "\n";

$qrisWithoutCRC = substr($testQRIS, 0, -4);
$providedCRC = substr($testQRIS, -4);

echo "Without CRC: $qrisWithoutCRC\n";
echo "Provided CRC: $providedCRC\n";

$calculatedCRC = ConvertCRC16($qrisWithoutCRC . "6304");
echo "Calculated CRC: $calculatedCRC\n";
echo "Match: " . ($providedCRC === $calculatedCRC ? "YES" : "NO") . "\n";

// Test conversion
echo "\n--- Testing Conversion ---\n";
$amount = "50000";

$step1 = str_replace("010211", "010212", $qrisWithoutCRC);
$parts = explode("5802ID", $step1);
$amountField = "54" . sprintf("%02d", strlen($amount)) . $amount;

$reconstructed = trim($parts[0]) . $amountField . "5802ID" . trim($parts[1]);
$finalCRC = ConvertCRC16($reconstructed . "6304");
$finalQRIS = $reconstructed . "6304" . $finalCRC;

echo "Final QRIS: $finalQRIS\n";
echo "Final length: " . strlen($finalQRIS) . "\n";
?>