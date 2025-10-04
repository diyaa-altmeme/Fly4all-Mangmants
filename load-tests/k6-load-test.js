import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  vus: 50,
  duration: "1m",
};

export default function() {
  // Replace with your actual API endpoint for fetching bookings
  const url = __ENV.BASE_URL + "/api/bookings?pageSize=50"; 
  
  // Ensure you have a valid Bearer token for authentication if required
  const params = {
    headers: { 
      Authorization: `Bearer ${__ENV.TEST_TOKEN}` 
    },
  };
  
  const res = http.get(url, params);
  
  check(res, { "status 200": (r) => r.status === 200 });
  
  sleep(1);
}
