const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

function convertJsonToCsv(jsonFilePath, csvFilePath) {
    try {
      const ARTICLE_SAP_CODE = 'Article_SAP_Code__c';
      const jsonData = require(jsonFilePath);
  
      const uniqueCurrencies = Array.from(new Set(jsonData.records.map((item) => item.CurrencyIsoCode)));
  
      const records = jsonData.records.reduce((acc, item) => {
        const existingRecord = acc.find((record) => record[ARTICLE_SAP_CODE] === item.Product2.Article_SAP_Code__c);
  
        if (existingRecord) {
          // Update existing record with the new currency and price
          const priceKey = `Price (${item.Pricebook2Id}) ${item.CurrencyIsoCode}`;
          existingRecord[priceKey] = item.UnitPrice;
        } else {
          // Create a new record
          const newRow = {
            [ARTICLE_SAP_CODE]: item.Product2.Article_SAP_Code__c,
            IsActive: item.IsActive,
          };
  
          uniqueCurrencies.forEach((currency) => {
            const priceKey = `Price (${item.Pricebook2Id}) ${currency}`;
            newRow[priceKey] = item.CurrencyIsoCode === currency ? item.UnitPrice : '';
          });
  
          acc.push(newRow);
        }
  
        return acc;
      }, []);
  
      const csvHeader = [
        { id: ARTICLE_SAP_CODE, title: 'Product StockKeepingUnit' },
        ...uniqueCurrencies.map((currency) => ({
          id: `Price (${jsonData.records[0].Pricebook2Id}) ${currency}`,
          title: `Price (${jsonData.records[0].Pricebook2Id}) ${currency}`,
        })),
        { id: 'IsActive', title: 'IsActive' },
      ];
  
      const csvWriter = createCsvWriter({
        header: csvHeader,
        path: csvFilePath,
      });
  
      csvWriter
        .writeRecords(records)
        .then(() => console.log('CSV file successfully written'))
        .catch((err) => console.error('Error writing CSV file:', err));
  
    } catch (error) {
      console.error(`Error processing JSON file ${jsonFilePath}: ${error}`);
    }
  }

function convertAllJsonFilesToCsv(directoryPath, csvDirectoryPath) {
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${err}`);
      return;
    }

    const jsonFiles = files.filter((file) => path.extname(file).toLowerCase() === '.json');

    // Check if the CSV directory exists, create it if not
    if (!fs.existsSync(csvDirectoryPath)) {
      fs.mkdirSync(csvDirectoryPath);
    }

    jsonFiles.forEach((jsonFile) => {
      const jsonFilePath = path.join(directoryPath, jsonFile);
      const csvFileName = path.basename(jsonFile, '.json') + '.csv';
      const csvFilePath = path.join(csvDirectoryPath, csvFileName);
      convertJsonToCsv(jsonFilePath, csvFilePath);
    });
  });
}

const jsonDirectoryPath = path.join(__dirname, 'json-files');
const csvDirectoryPath = './SALESFORCE_RO';

convertAllJsonFilesToCsv(jsonDirectoryPath, csvDirectoryPath);
