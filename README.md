# Playwright Stock Market Tracker

A comprehensive stock market tracking system built with Playwright that automates the collection and tracking of 52-week high stocks from Economic Times India. This project helps traders and investors monitor stock performance over time with automated price updates and detailed tracking reports.

## 🚀 Features

- **Automated Stock Data Collection**: Scrapes 52-week high stocks from Economic Times India
- **Price Tracking**: Tracks initial prices and monitors current prices over time
- **Smart Name Matching**: Intelligent stock name matching with customizable mappings
- **Data Persistence**: Maintains historical tracking data with automatic backups
- **Price Updates**: Updates stock prices from CSV files with advanced matching algorithms
- **Performance Analytics**: Calculates percentage changes and performance metrics
- **Backup System**: Automatic backup creation before data updates

## 📁 Project Structure

```
playwright-stock-market/
├── src/test/
│   ├── scrap-52weeks-high-stock.spec.ts    # Basic company name extraction
│   ├── 52weeks-track-stocks.spec.ts        # Main stock tracking functionality
│   ├── update-prices-track-stocks.spec.ts  # Advanced price updates from CSV
│   └── stock_mappings.ts                   # Stock name mapping configurations
├── test-results/                           # Playwright test results
├── package.json                            # Project dependencies and scripts
├── tsconfig.json                           # TypeScript configuration
└── README.md                               # Project documentation
```

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SangamnathIngalalli/playwright-stock-market.git
   cd playwright-stock-market
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Playwright browsers**:
   ```bash
   npx playwright install
   ```

## 📊 Usage

###  For Daily Use (Recommended) all flow in single Run:
``` bash
npm run test:full-pipeline
```

### Basic Stock Extraction
Extract company names from 52-week high stocks:
```bash
npx playwright test simple-test.spec.ts
```

### Stock Tracking
Track 52-week high stocks with price monitoring:
```bash
npx playwright test track-stocks.spec.ts
```

### Price Updates
Update stock prices from CSV files:
```bash
npx playwright test update-prices-text.spec.ts
```

### Run All Tests
```bash
npx playwright test
```

## 📈 How It Works

### 1. Stock Data Collection
- Navigates to Economic Times 52-week high page
- Extracts stock names and current prices
- Handles dynamic content loading and data parsing

### 2. Data Storage
- Creates tracking files in `C:\Users\Administrator\OneDrive\Swing Trading\tracking\`
- Maintains formatted tracking data with headers
- Creates automatic backups before updates

### 3. Price Updates
- Reads price data from CSV files
- Uses intelligent name matching algorithms
- Updates existing tracking records with new prices
- Calculates percentage changes from initial prices

### 4. Smart Matching
The system includes sophisticated name matching:
- Direct mapping from `stock_mappings.ts`
- Normalized name matching (handles LTD/Limited, &/AND, etc.)
- Case-insensitive matching
- Partial matching with abbreviation handling

## 🔧 Configuration

### Stock Mappings
Edit `src/test/stock_mappings.ts` to add custom stock name mappings:
```typescript
export const nameMappings: StockMappings = {
  'Nippon Life AMC': 'NIPPON L I A M LTD',
  'Bajaj Finance': 'BAJAJ FINANCE LIMITED',
  // Add more mappings as needed
};
```

### File Paths
The system uses these default paths (modify in test files as needed):
- **Tracking Folder**: `C:\Users\Administrator\OneDrive\Swing Trading\tracking\`
- **Price CSV**: `C:\Users\Administrator\OneDrive\Swing Trading\today_price.csv`
- **Tracking File**: `track.txt`

## 📋 Data Format

### Tracking File Format
```
Stock Name                First Date  Init Price Last Date   Curr Price % Diff
=========================================================================================================
RELIANCE INDUSTRIES LTD   15-01-2024     2500.00  20-01-2024     2550.00   2.00%
TATA CONSULTANCY SERV LTD 15-01-2024     3800.00  20-01-2024     3750.00  -1.32%
```

### CSV Input Format
Expected CSV format for price updates:
```csv
GAIN_LOSS,SECURITY,CLOSE_PRIC,PREV_CL_PR,PERCENT_CG
+,RELIANCE INDUSTRIES LTD,2550.00,2500.00,2.00
-,TATA CONSULTANCY SERV LTD,3750.00,3800.00,-1.32
```

## 🎯 Key Features Explained

### Intelligent Name Matching
- **Direct Mapping**: Uses predefined mappings for common name variations
- **Normalization**: Standardizes company name formats (LTD → Limited, & → AND)
- **Fuzzy Matching**: Handles partial matches and abbreviations
- **Case Insensitive**: Matches regardless of case differences

### Backup System
- Automatic backup creation before any data updates
- Timestamped backup files for easy recovery
- Preserves historical data integrity

### Performance Tracking
- Calculates percentage changes from initial prices
- Tracks first date and last update date
- Maintains comprehensive performance history

## 🚨 Requirements

- **Node.js**: Version 16 or higher
- **Playwright**: Latest version
- **TypeScript**: For type safety and development
- **File System Access**: Read/write permissions for tracking files

## 📝 Dependencies

- `@playwright/test`: End-to-end testing framework
- `playwright`: Browser automation
- `typescript`: TypeScript support
- `@types/node`: Node.js type definitions
- `csv-parser`: CSV file parsing
- `xlsx`: Excel file support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🔗 Repository

- **GitHub**: [playwright-stock-market](https://github.com/SangamnathIngalalli/playwright-stock-market)
- **Issues**: [Report Issues](https://github.com/SangamnathIngalalli/playwright-stock-market/issues)

## 📞 Support

For questions or support, please open an issue on the GitHub repository.

---

**Note**: This tool is designed for educational and personal use. Please ensure compliance with website terms of service and applicable regulations when using web scraping functionality.