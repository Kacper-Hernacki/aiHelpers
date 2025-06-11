// routes/canvaTemplate.routes.ts
import { Router } from 'express';
import { canvaTemplateController } from '../controllers/canvaTemplate.controller.ts';

const router = Router();

router.post('/generate-canva-card', canvaTemplateController.generateCard);
router.get('/auth/canva', canvaTemplateController.auth);
router.get('/auth/canva/callback', canvaTemplateController.callback);

export default router;
