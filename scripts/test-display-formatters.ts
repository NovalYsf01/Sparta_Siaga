import {
  cleanDisplayTitle,
  cleanDisplayText,
  formatEarthquakeNotificationBody,
  formatNotificationWibTimestamp,
  humanizeDocumentStatus,
} from "../lib/display-formatters";

function runTests() {
  console.log("=== Running Display Formatters Tests ===");

  // 1. Test cleanDisplayTitle
  const t1 = "[UAT-ATASAN-2] Peringatan Gempa Otomatis M 5.2 Wilayah Jawa Barat";
  const res1 = cleanDisplayTitle(t1);
  console.log(`Test 1: "${t1}" -> "${res1}"`);
  if (res1 !== "Peringatan Gempa M 5.2 di Wilayah Jawa Barat") {
    throw new Error(`Expected 'Peringatan Gempa M 5.2 di Wilayah Jawa Barat', got '${res1}'`);
  }

  const t2 = "[SIMULASI] Laporan Kejadian Banjir";
  const res2 = cleanDisplayTitle(t2);
  console.log(`Test 2: "${t2}" -> "${res2}"`);
  if (res2 !== "Laporan Kejadian Banjir") {
    throw new Error(`Expected 'Laporan Kejadian Banjir', got '${res2}'`);
  }

  // 2. Test cleanDisplayText
  const txt1 = "[UAT-ATASAN-1] Plafon gypsum ambrol seluas 4x3m di area sales";
  const resTxt1 = cleanDisplayText(txt1);
  console.log(`Test 3: "${txt1}" -> "${resTxt1}"`);
  if (resTxt1 !== "Plafon gypsum ambrol seluas 4x3m di area sales") {
    throw new Error(`Expected cleaned text, got '${resTxt1}'`);
  }

  // 3. Test formatEarthquakeNotificationBody
  const body = formatEarthquakeNotificationBody({
    magnitude: 5.2,
    depthKm: 10,
    region: "Jawa Barat",
    storeName: "Babakan Sari",
    storeCode: "SAT-B017",
    radiusKm: 35,
  });
  console.log(`Test 4: formatEarthquakeNotificationBody -> "${body}"`);
  if (!body.includes("Babakan Sari") || !body.includes("radius pemantauan 35 km")) {
    throw new Error(`Body does not contain expected values: ${body}`);
  }

  // 4. Test formatNotificationWibTimestamp
  const time = formatNotificationWibTimestamp(new Date("2026-10-21T14:07:00+07:00"));
  console.log(`Test 5: formatNotificationWibTimestamp -> "${time}"`);
  if (!time.includes("WIB · SPARTA SIAGA")) {
    throw new Error(`Timestamp formatting failed: ${time}`);
  }

  // 5. Test humanizeDocumentStatus
  const docStatus1 = humanizeDocumentStatus("ESTIMASI", false);
  console.log(`Test 6: humanizeDocumentStatus false -> "${docStatus1}"`);
  if (docStatus1 !== "Dokumen Estimasi Biaya belum diunggah") {
    throw new Error(`Expected 'Dokumen Estimasi Biaya belum diunggah', got '${docStatus1}'`);
  }

  const docStatus2 = humanizeDocumentStatus("ESTIMASI", true);
  console.log(`Test 7: humanizeDocumentStatus true -> "${docStatus2}"`);
  if (docStatus2 !== "Dokumen Estimasi Biaya tersedia") {
    throw new Error(`Expected 'Dokumen Estimasi Biaya tersedia', got '${docStatus2}'`);
  }

  console.log("✔ ALL DISPLAY FORMATTER TESTS PASSED!");
}

runTests();
