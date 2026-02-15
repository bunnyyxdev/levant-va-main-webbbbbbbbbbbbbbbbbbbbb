/**
 * Database cleanup script to fix flights stuck in "Pending" status
 * This updates flights with approved_status=0 to approved_status=1 if they meet approval criteria
 * 
 * Run with: node scripts/fix-pending-flights.js
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const AUTO_REJECT_THRESHOLD = parseInt(process.env.AUTO_PIREP_REJECT_LANDING_RATE || '-700');

async function fixPendingFlights() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully');

        const Flight = mongoose.model('Flight', new mongoose.Schema({}, { strict: false, collection: 'flights' }));

        // Find all flights with approved_status = 0 (Pending)
        const pendingFlights = await Flight.find({ approved_status: 0 });
        
        console.log(`Found ${pendingFlights.length} flights with Pending status`);

        let approvedCount = 0;
        let rejectedCount = 0;
        let skippedCount = 0;

        for (const flight of pendingFlights) {
            const landingRate = flight.landing_rate || 0;
            
            // If landing rate is above the rejection threshold, approve it
            if (landingRate > AUTO_REJECT_THRESHOLD) {
                await Flight.updateOne(
                    { _id: flight._id },
                    { $set: { approved_status: 1 } }
                );
                approvedCount++;
                console.log(`✓ Approved: ${flight.callsign} (${flight.departure_icao}→${flight.arrival_icao}) - Landing: ${landingRate} fpm`);
            }
            // If landing rate is at or below threshold, reject it
            else if (landingRate <= AUTO_REJECT_THRESHOLD) {
                await Flight.updateOne(
                    { _id: flight._id },
                    { $set: { approved_status: 2 } }
                );
                rejectedCount++;
                console.log(`✗ Rejected: ${flight.callsign} (${flight.departure_icao}→${flight.arrival_icao}) - Landing: ${landingRate} fpm`);
            }
            else {
                skippedCount++;
                console.log(`⊘ Skipped: ${flight.callsign} - No landing rate data`);
            }
        }

        console.log('\n=== Summary ===');
        console.log(`Total Pending: ${pendingFlights.length}`);
        console.log(`Approved: ${approvedCount}`);
        console.log(`Rejected: ${rejectedCount}`);
        console.log(`Skipped: ${skippedCount}`);

        await mongoose.disconnect();
        console.log('\nDatabase connection closed');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixPendingFlights();
