import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../../../services/metrics.service';
import { ContentTypeEnum } from '@prisma/client';
import { ViolationInput } from '../../../types/metrics.types';

const metricsService = new MetricsService();

export class MetricsController {
  static async getVideoMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, courseInstanceId, videoId } = req.query;
      const data = await metricsService.getVideoMetrics(
        studentId as string,
        courseInstanceId as string,
        videoId as string
      );
      res.json(data || {});
    } catch (error) {
      next(error);
    }
  }

  static async updateVideoMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, courseInstanceId, videoId, replays } = req.body;
      const data = await metricsService.updateVideoMetrics(studentId, courseInstanceId, videoId, replays);
      res.json({ status: 'updated', data });
    } catch (error) {
      next(error);
    }
  }

  static async recordViolationWithImages(req: Request, res: Response, next: NextFunction) {
    try {
      const input: ViolationInput = req.body;
      const data = await metricsService.recordViolationWithImages(input);
      res.json({ status: 'recorded', violationId: data.id });
    } catch (error) {
      next(error);
    }
  }

  static async getViolations(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, contentTypeId } = req.query;
      const data = await metricsService.getViolations(studentId as string, contentTypeId as string);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}
