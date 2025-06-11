// controllers/canvaTemplate.controller.ts
import { Request, Response } from 'express';
import { canvaTemplateService } from '../services/template/canvaTemplate.service.ts';

export const canvaTemplateController = {
  async generateCard(req: Request, res: Response) {
    const { templateId, title, imageUrl } = req.body;

    if (!templateId || !title || !imageUrl) {
      return res.status(400).json({ success: false, message: 'Missing required fields: templateId, title, imageUrl' });
    }

    try {
      const result = await canvaTemplateService.createSocialCardFromTemplate(templateId, title, imageUrl);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async auth(req: Request, res: Response) {
    // This will redirect the user to Canva for authorization
    // Implementation to follow
    res.send('Canva auth endpoint');
  },

  async callback(req: Request, res: Response) {
    const { code } = req.query;
    if (typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing authorization code' });
    }

    try {
      await canvaTemplateService.handleCallback(code);
      res.send('Successfully authenticated with Canva!');
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
