import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import * as documentosController from '../controllers/documentosController.js';

export const documentosRotas = Router();

documentosRotas.use(autenticar);
documentosRotas.get('/', documentosController.listar);
documentosRotas.post('/', documentosController.criar);
documentosRotas.get('/:id', documentosController.obter);
documentosRotas.put('/:id', documentosController.atualizar);
documentosRotas.delete('/:id', documentosController.remover);
documentosRotas.post('/:id/analise', documentosController.analisar);
