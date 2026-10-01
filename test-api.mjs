const testAPI = async () => {
  try {
    const res = await fetch("http://127.0.0.1:3004/api/incidents/history");
    const data = await res.text();
    console.log("History API Response:", res.status, data.substring(0, 100));
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
};
testAPI();
