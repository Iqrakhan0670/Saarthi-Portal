import dotenv from 'dotenv';
dotenv.config();
import { initEnvCache, getEnv } from './utils/envLoader.js';
initEnvCache();

import { downloadFileFromGCS } from './config/gcsStorage.js';

async function main() {
    const bucketName = 'jobportal-resumes';
    const fileName = 'resumes/user-22-1765272673597.pdf';

    console.log(`Attempting to download GCS file: gs://${bucketName}/${fileName}`);
    try {
        const fileBuffer = await downloadFileFromGCS(bucketName, fileName);
        console.log('Success! Downloaded', fileBuffer.length, 'bytes');
    } catch (error) {
        console.error('Download failed with error:');
        console.error(error.message);
        console.error(error.stack);
    }
}

main().catch(console.error);
