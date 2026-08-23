import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    } else {
      console.log('CONSOLE LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  await page.goto('https://medocarezt.vercel.app/', { waitUntil: 'networkidle2' });
  
  const content = await page.content();
  console.log("HTML length:", content.length);
  
  await browser.close();
})();
