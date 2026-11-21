// The report shows these sections in this order.
// To add a new check: create a file exporting { id, title, inputs?, run(ctx) } and add it here.
// run() returns { status: 'good'|'warn'|'bad'|'info', summary, details: [], remember?: {} }, or null to hide the card.
import claims from './claims.js';
import health from './health.js';
import processing from './processing.js';
import co2 from './co2.js';
import journey from './journey.js';
import price from './price.js';
import nutrition from './nutrition.js';
import aiClaims from './ai-claims.js';

export default [claims, health, processing, co2, journey, price, nutrition, aiClaims];
