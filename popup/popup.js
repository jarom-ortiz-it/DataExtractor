//File: popup/popup.js
document.addEventListener('DOMContentLoaded', function() {
    const extractButton = document.getElementById('extractButton');
    const dataDisplay = document.getElementById('dataDisplay');

    // Load and display persisted data
    chrome.storage.local.get(['extractedData'], function(result) {
        if (result.extractedData) {
            dataDisplay.textContent = JSON.stringify(result.extractedData, null, 2);
        }
    });

    extractButton.addEventListener('click', function() {
        // Dummy data for demonstration
        const dummyData = {
            field1: 'Value 1',
            field2: 'Value 2',
            field3: 'Value 3'
        };

        // Store the dummy data
        chrome.storage.local.set({extractedData: dummyData}, function() {
            console.log('Data saved');
            dataDisplay.textContent = JSON.stringify(dummyData, null, 2);
        });
    });
});