/**
 * Returns a greeting based on the current time in Brasília timezone
 * "Bom dia" (6:00-11:59), "Boa tarde" (12:00-17:59), "Boa noite" (18:00-5:59)
 */
export function getGreeting(): string {
  // Get current time in Brasília (UTC-3)
  const now = new Date();
  const brasiliaOffset = -3 * 60; // UTC-3 in minutes
  const localOffset = now.getTimezoneOffset();
  const brasiliaTime = new Date(now.getTime() + (localOffset + brasiliaOffset) * 60 * 1000);
  
  const hour = brasiliaTime.getHours();
  
  if (hour >= 6 && hour < 12) {
    return "Bom dia";
  } else if (hour >= 12 && hour < 18) {
    return "Boa tarde";
  } else {
    return "Boa noite";
  }
}
