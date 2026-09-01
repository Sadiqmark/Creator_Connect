import { logger } from '../../middleware/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailService {
  sendEmail(options: EmailOptions): Promise<void>;
}

export class DevelopmentEmailService implements EmailService {
  async sendEmail(options: EmailOptions): Promise<void> {
    logger.info(
      {
        to: options.to,
        subject: options.subject,
        preview: options.text.slice(0, 100),
      },
      '📧 [DEV EMAIL MOCK] Message logged (zero-cost development adapter)'
    );
  }
}

export const emailService: EmailService = new DevelopmentEmailService();
