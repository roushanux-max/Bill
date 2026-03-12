
import { getCustomers, getProducts } from './src/app/utils/storage.js';

async function verify() {
    try {
        const customers = await getCustomers();
        const products = await getProducts();
        console.log(`Total Customers: ${customers.length}`);
        console.log(`Total Products: ${products.length}`);
        
        if (customers.length > 0 && products.length > 0) {
            console.log("Checklist Step 2: SUCCESS - Data counts are non-zero.");
        } else {
            console.log("Checklist Step 2: FAILED - Data counts are zero.");
        }
    } catch (e) {
        console.error("Verification failed:", e);
    }
}

verify();
