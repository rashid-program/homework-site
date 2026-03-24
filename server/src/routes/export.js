import { Router }        from 'express';
import puppeteer          from 'puppeteer';

const router = Router();

/**
 * POST /api/export/pdf
 * Body: { config: "1:2,5:1", includeTasks: true, includeAnswers: false }
 * Returns: PDF file
 */
router.post('/pdf', async (req, res, next) => {
  let browser;
  try {
    const {
      config,
      includeTasks  = true,
      includeAnswers = false,
    } = req.body;

    if (!config) {
      return res.status(400).json({ success: false, error: 'config обязателен' });
    }
    if (!includeTasks && !includeAnswers) {
      return res.status(400).json({ success: false, error: 'Выберите хотя бы один тип PDF' });
    }

    const PORT = process.env.PORT || 3000;
    const qs   = new URLSearchParams({
      config,
      tasks:   includeTasks   ? '1' : '0',
      answers: includeAnswers ? '1' : '0',
    });
    const url = `http://localhost:${PORT}/pdf-template.html?${qs}`;

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 }); // A4 px at 96dpi

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 40_000 });

    // Wait until JS signals render is complete
    await page.waitForFunction(
      () => document.body.dataset.ready === 'true',
      { timeout: 20_000 }
    );

    const pdf = await page.pdf({
      format:          'A4',
      printBackground: true,
      margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
    });

    await browser.close();
    browser = null;

    const filename = `variant-oge-${Date.now()}.pdf`;
    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length',      pdf.length);
    res.end(pdf);

  } catch (err) {
    next(err);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

export default router;
