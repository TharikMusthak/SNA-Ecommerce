import { pool } from "../src/config/db.js";
import { processNotificationQueue } from "../src/integrations/notifications/notification.service.js";

try { console.log(await processNotificationQueue()); }
finally { await pool.end(); }
