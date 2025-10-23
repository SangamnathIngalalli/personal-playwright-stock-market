import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestResult {
  testName: string;
  success: boolean;
  output: string;
  error?: string;
}

class SequentialTestRunner {
  private tests = [
    {
      name: 'Company Name Extraction',
      file: 'scrap-52weeks-high-stock.spec.ts',
      description: 'Extracting company names from 52-week high stocks'
    },
    {
      name: 'Stock Tracking',
      file: '52weeks-track-stocks.spec.ts',
      description: 'Tracking 52-week high stocks with price monitoring'
    },
    {
      name: 'Price Updates',
      file: 'update-prices-track-stocks.spec.ts',
      description: 'Updating stock prices from CSV files'
    }
  ];

  async runSequentialTests(): Promise<void> {
    console.log('🚀 Starting Sequential Stock Market Pipeline...\n');
    console.log('=' .repeat(60));
    
    const results: TestResult[] = [];
    
    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i];
      console.log(`\n📋 Step ${i + 1}/${this.tests.length}: ${test.name}`);
      console.log(`📝 Description: ${test.description}`);
      console.log(`📁 File: ${test.file}`);
      console.log('-'.repeat(50));
      
      try {
        const { stdout, stderr } = await execAsync(`npx playwright test ${test.file}`);
        
        if (stderr && !stderr.includes('warning')) {
          throw new Error(stderr);
        }
        
        results.push({
          testName: test.name,
          success: true,
          output: stdout
        });
        
        console.log(`✅ ${test.name} completed successfully!`);
        
        // Add a small delay between tests
        if (i < this.tests.length - 1) {
          console.log('⏳ Waiting 2 seconds before next test...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          testName: test.name,
          success: false,
          output: '',
          error: errorMessage
        });
        
        console.log(`❌ ${test.name} failed!`);
        console.log(`Error: ${errorMessage}`);
        
        // Ask user if they want to continue
        console.log('\n⚠️  Pipeline stopped due to failure.');
        console.log('You can run individual tests or fix the issue and restart.');
        break;
      }
    }
    
    this.printSummary(results);
  }
  
  private printSummary(results: TestResult[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PIPELINE EXECUTION SUMMARY');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} Step ${index + 1}: ${result.testName}`);
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    if (successful === results.length) {
      console.log('\n🎉 All tests completed successfully!');
      console.log('📁 Check your tracking files for updated data.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   • Check the generated files in your tracking folder');
    console.log('   • Review the test results for any issues');
    console.log('   • Run individual tests if needed: npm run test:scrap, test:track, test:update');
  }
}

// Run the sequential tests
async function main() {
  const runner = new SequentialTestRunner();
  await runner.runSequentialTests();
}

main().catch(console.error);
