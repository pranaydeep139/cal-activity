import prisma from '../config/prisma';
import { AssessmentAttemptStatusEnum, AssessmentStatusEnum } from '@prisma/client';
import { MSQAnswer, SubmissionAnswers } from '../types/assessment.types';

export class AssessmentRepository {
  async getAssessmentProgress(studentId: string, assessmentId: string, courseInstanceId: string) {
    const progress = await prisma.studentAssessmentProgress.findUnique({
      where: { studentId_assessmentId_courseInstanceId: { studentId, assessmentId, courseInstanceId } },
    });
    return progress?.assessmentStatus;
  }
  async createAttempt(studentId: string, courseInstanceId: string, assessmentId: string): Promise<{ attemptId: number }> {
    const attempt = await prisma.studentAssessmentAttemptHistory.create({
      data: {
        studentId,
        courseInstanceId,
        assessmentId,
        attemptTime: new Date(),
        status: AssessmentAttemptStatusEnum.IN_PROGRESS,
      },
    });
    return { attemptId: attempt.attemptId };
  }

  public async updateAssessmentStatus(
    studentId: string,
    assessmentId: string,
    courseInstanceId: string,
    status: AssessmentStatusEnum
  ): Promise<void> {
    try {
      // First check if the record exists
      const progress = await prisma.studentAssessmentProgress.findUnique({
        where: {
          studentId_assessmentId_courseInstanceId: {
            studentId,
            assessmentId,
            courseInstanceId,
          },
        },
      });

      if (!progress) {
        // If record doesn't exist, create it
        await prisma.studentAssessmentProgress.create({
          data: {
            studentId,
            assessmentId,
            courseInstanceId,
            assessmentStatus: status,
          },
        });
      } else if (progress.assessmentStatus !== AssessmentStatusEnum.PASSED) {
        // Only update if exists and not already PASSED
        await prisma.studentAssessmentProgress.update({
          where: {
            studentId_assessmentId_courseInstanceId: {
              studentId,
              assessmentId,
              courseInstanceId,
            },
          },
          data: {
            assessmentStatus: status,
          },
        });
      }
    } catch (error) {
      console.error('Error updating assessment status:', error);
      throw error;
    }
  }

  public async createAssessmentProgress(
    studentId: string,
    courseInstanceId: string,
    assessmentId: string
  ): Promise<void> {
    try {
      await prisma.studentAssessmentProgress.upsert({
        where: {
          studentId_assessmentId_courseInstanceId: {
            studentId,
            assessmentId,
            courseInstanceId,
          },
        },
        update: {}, // Don't update anything if it exists
        create: {
          studentId,
          assessmentId,
          courseInstanceId,
          assessmentStatus: AssessmentStatusEnum.PENDING,
        },
      });
    } catch (error) {
      console.error('Error creating assessment progress:', error);
      throw error;
    }
  }

  async updateAttemptStatus(attemptId: number, status: AssessmentAttemptStatusEnum): Promise<void> {
    await prisma.studentAssessmentAttemptHistory.update({
      where: { attemptId },
      data: { status, updatedAt: new Date() },
    });
  }

  async getAttempt(attemptId: number): Promise<SubmissionAnswers> {
    const attempt = await prisma.studentAssessmentAttemptHistory.findUnique({
      where: { attemptId },
      include: {
        natAnswers: true,
        descriptiveAnswers: true,
        mcqAnswers: true,
        msqAnswers: true,
      },
    });

    if (!attempt) {
      throw new Error(`Attempt with ID ${attemptId} not found`);
    }

    const msqAnswers = attempt.msqAnswers.reduce<MSQAnswer[]>((result, msq) => {
      const existing = result.find(item => item.questionId === msq.questionId);
      if (existing) {
        existing.choiceIds.push(msq.choiceId);
      } else {
        result.push({ questionId: msq.questionId, choiceIds: [msq.choiceId] });
      }
      return result;
    }, []);

    return {
      natAnswers: attempt.natAnswers.map(a => ({
        questionId: a.questionId,
        value: a.value,
      })),
      descriptiveAnswers: attempt.descriptiveAnswers.map(a => ({
        questionId: a.questionId,
        answerText: a.answerText,
      })),
      mcqAnswers: attempt.mcqAnswers.map(a => ({
        questionId: a.questionId,
        choiceId: a.choiceId,
      })),
      msqAnswers,
    };
  }
}
