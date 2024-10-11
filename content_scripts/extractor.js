//File: content_scripts/extractor.js
console.log('Data Extractor content script loaded on:', window.location.href);

let retryCount = 0;
const MAX_RETRIES = 3;

function cleanValue(value) {
    if (!value) return 'N/A';
    // Preserve original spacing, including new lines
    return value.replace(/^\s+|\s+$/g, '') || 'N/A';
}

function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout waiting for ${selector}`));
        }, timeout);
    });
}

async function extractInsightlyData() {
    console.log('Extracting Insightly data');
    const data = {
        projectId: window.location.pathname.split('/').pop(),
        projectName: document.title,
        url: window.location.href,
        timestamp: new Date().toISOString()
    };

    const fieldMappings = {
        'Funding Kickback Status': 'metadata-row-viewer-PROJECT_FIELD_229',
        'Funding Kickback Reason': 'metadata-row-viewer-PROJECT_FIELD_549',
        'Funding Kickback Notes': 'metadata-row-viewer-Funding_Kickback_Notes_M__c',
        'FSD Status Update': 'metadata-row-viewer-FSD_Status_Update__c',
        'Post Install Work Completed': 'metadata-row-viewer-Punch_List_Completed__c',
        'Post Install Work Scheduled': 'metadata-row-viewer-Insp_Prp_Wrk_Sch__c',
        'Post Install Work Details': 'metadata-row-viewer-Inspection_Prep_Work_Details__c',
        'Additional Work Notes': 'metadata-row-viewer-PROJECT_FIELD_658'
    };

    let fieldsFound = false;
    for (const [fieldName, fieldId] of Object.entries(fieldMappings)) {
        try {
            const element = await waitForElement(`#${fieldId}`);
            // Use textContent to preserve formatting, including new lines
            data[fieldName] = cleanValue(element.textContent);
            console.log(`Found ${fieldName}:`, data[fieldName]);
            fieldsFound = true;
        } catch (error) {
            console.log(`Field not found: ${fieldName}`);
            data[fieldName] = 'Field not found';
        }
    }

    if (!fieldsFound) {
        return { error: "Fields not found" };
    }

    console.log('Extracted data:', data);
    return { data: data };
}

async function extractSunRunData() {
    console.log('Extracting SunRun data');
    const data = {
        url: window.location.href,
        timestamp: new Date().toISOString()
    };

    const fieldMappings = {
        'Status Update': '00N60000002WJIm_ileinner',
        'Final Findings': '00N60000002VX72_ileinner',
        'Submit Findings': '00N60000002VX7L_ileinner',
        'Time Submitted': '00N60000002VX7S_ileinner',
        'Last Modified By': 'LastModifiedBy_ileinner'
    };

    let fieldsFound = false;
    for (const [fieldName, fieldId] of Object.entries(fieldMappings)) {
        try {
            const element = await waitForElement(`#${fieldId}`);
            // Use textContent to preserve formatting, including new lines
            data[fieldName] = cleanValue(element.textContent);
            console.log(`Found ${fieldName}:`, data[fieldName]);
            fieldsFound = true;
        } catch (error) {
            console.log(`Field not found: ${fieldName}`);
            data[fieldName] = 'Field not found';
        }
    }

    if (!fieldsFound) {
        return { error: "Fields not found" };
    }

    console.log('Extracted data:', data);
    return { data: data };
}

async function extractData() {
    if (window.location.hostname === "crm.na1.insightly.com" && 
        window.location.pathname.includes("/details/project/")) {
        return extractInsightlyData();
    } else if (window.location.hostname === "sunrun.my.site.com" &&
               window.location.pathname.includes("/partner/")) {
        return extractSunRunData();
    } else {
        return { error: "Not a valid Insightly or SunRun page" };
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Received message:', request);
    if (request.action === "extract") {
        extractData().then(response => {
            if (response.error === "Fields not found" && retryCount < MAX_RETRIES) {
                retryCount++;
                console.log(`Retrying extraction, attempt ${retryCount}`);
                setTimeout(() => {
                    extractData().then(sendResponse);
                }, 1000 * retryCount);
            } else {
                retryCount = 0;
                sendResponse(response);
            }
        });
        return true; // Indicates that we will send a response asynchronously
    }
});