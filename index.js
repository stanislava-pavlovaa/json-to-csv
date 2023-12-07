const fs = require('fs').promises;
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const ARTICLE_SAP_CODE = 'Article_SAP_Code__c';

async function readJsonFile(jsonFilePath) {
  try {
    const jsonData = await fs.readFile(jsonFilePath, 'utf8');
    return JSON.parse(jsonData);
  } catch (error) {
    throw new Error(`Error reading JSON file ${jsonFilePath}: ${error}`);
  }
}

async function writeCsvFile(csvFilePath, csvHeader, records) {
  const csvWriter = createCsvWriter({
    header: csvHeader,
    path: csvFilePath,
  });

  try {
    await csvWriter.writeRecords(records);
    console.log(`CSV file ${csvFilePath} successfully written`);
  } catch (err) {
    throw new Error(`Error writing CSV file: ${err}`);
  }
}

async function convertJsonToCsv(jsonFilePath, csvFilePath) {
  try {
    const jsonData = await readJsonFile(jsonFilePath);
    const uniqueCurrencies = Array.from(new Set(jsonData.records.map((item) => item.CurrencyIsoCode)));
    const records = processJsonData(jsonData, uniqueCurrencies);

    const csvHeader = [
      { id: ARTICLE_SAP_CODE, title: 'Product StockKeepingUnit' },
      ...uniqueCurrencies.map((currency) => ({
        id: `Price (${jsonData.records[0].Pricebook2Id}) ${currency}`,
        title: `Price (${jsonData.records[0].Pricebook2Id}) ${currency}`,
      })),
      { id: 'IsActive', title: 'IsActive' },
    ];

    await writeCsvFile(csvFilePath, csvHeader, records);
  } catch (error) {
    console.error(error.message);
  }
}

function processJsonData(jsonData, uniqueCurrencies) {
  return jsonData.records.reduce((acc, item) => {
    const existingRecord = acc.find((record) => record[ARTICLE_SAP_CODE] === item.Product2.Article_SAP_Code__c);

    if (existingRecord) {
      const priceKey = `Price (${item.Pricebook2Id}) ${item.CurrencyIsoCode}`;
      existingRecord[priceKey] = item.UnitPrice;
    } else {
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
}

async function convertAllJsonFilesToCsv(directoryPath, csvDirectoryPath) {
  try {
    const files = await fs.readdir(directoryPath);
    const jsonFiles = files.filter((file) => path.extname(file).toLowerCase() === '.json');

    try {
      await fs.access(csvDirectoryPath);
    } catch (error) {
      await fs.mkdir(csvDirectoryPath);
    }

    for (const jsonFile of jsonFiles) {
      const jsonFilePath = path.join(directoryPath, jsonFile);
      const csvFileName = path.basename(jsonFile, '.json') + '.csv';
      const csvFilePath = path.join(csvDirectoryPath, csvFileName);
      await convertJsonToCsv(jsonFilePath, csvFilePath);
    }
  } catch (error) {
    console.error(`Error reading directory: ${error}`);
  }
}

const jsonDirectoryPath = path.join(__dirname, 'json-files');
const csvDirectoryPath = './SALESFORCE_RO';

convertAllJsonFilesToCsv(jsonDirectoryPath, csvDirectoryPath);
