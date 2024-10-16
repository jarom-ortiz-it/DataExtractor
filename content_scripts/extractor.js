console.log('Data Extractor content script loaded on:', window.location.href);

let retryCount = 0;
const MAX_RETRIES = 3;

function cleanValue(value) {
    if (!value) return 'N/A';
    return value.replace(/^\s+|\s+$/g, '') || 'N/A';
}

function highlightDates(text) {
    // This regex looks for common date formats including yyyy-mm-dd and single digit month/day
    const datePattern = /\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}(?!\/)\b)/gi;
    return text.replace(datePattern, match => `<span style="background-color: yellow;">${match}</span>`);
}

function extractFSDNumber(text) {
    // This regex looks for FSD numbers in various formats
    const fsdPatterns = [
        /\b(?:FSD-?)?(\d{6,7})\b/i,  // Matches FSD-1014065, FSD1014065, or 1014065
        /\b(?:FSD-?)?(\d{3}-?\d{3,4})\b/i,  // Matches FSD-967-465, FSD967465, or 967-465
        /\b(?:Field Service Dispatch|Dispatch):\s*(\d{6,7})\b/i  // Matches "Field Service Dispatch: 1014065" or "Dispatch: 1014065"
    ];

    for (let pattern of fsdPatterns) {
        const match = text.match(pattern);
        if (match) {
            // Extract only the digits
            let fsdNumber = match[1].replace(/\D/g, '');
            
            // Ensure we have a 6 or 7 digit number
            if (fsdNumber.length >= 6 && fsdNumber.length <= 7) {
                // Check if the number is in the valid range (900000 and above)
                if (parseInt(fsdNumber) >= 900000) {
                    return fsdNumber;
                }
            }
        }
    }
    return 'FSD number not found';
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
        'Additional Work Notes': 'metadata-row-viewer-PROJECT_FIELD_658',
        'Customer/Rep Work Request Details': 'metadata-row-viewer-CustomerRep_Work_Request_Details__c'
    };

    let fieldsFound = false;
    let pageText = '';
    for (const [fieldName, fieldId] of Object.entries(fieldMappings)) {
        try {
            const element = await waitForElement(`#${fieldId}`);
            let value = cleanValue(element.textContent);
            data[fieldName] = highlightDates(value);
            pageText += ' ' + value;
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

    // Extract FSD Number
    data.fsdNumber = extractFSDNumber(pageText);

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
    let pageText = '';
    for (const [fieldName, fieldId] of Object.entries(fieldMappings)) {
        try {
            const element = await waitForElement(`#${fieldId}`);
            let value = cleanValue(element.textContent);
            data[fieldName] = highlightDates(value);
            pageText += ' ' + value;
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

    // Extract FSD Number
    data.fsdNumber = extractFSDNumber(pageText);

    console.log('Extracted data:', data);
    return { data: data };
}

async function extractData() {
    console.log('Current URL:', window.location.href);  // Add this line for debugging
    if (window.location.hostname === "crm.na1.insightly.com" && 
        window.location.pathname.toLocaleLowerCase().includes("/details/project/")) {
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