import { Router } from 'express';
import * as authController from '../controllers/authController.js';

export const authRotas = Router();

authRotas.post('/cadastro', authController.cadastro);
authRotas.post('/login', authController.login);
