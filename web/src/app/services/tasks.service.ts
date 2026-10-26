import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';
import type { Task, TaskErrorResponse } from '../models/task.models';

const TASKS_PATH = '/api/tasks';
const TASKS_LOAD_ERROR = 'No se pudo cargar el dashboard';

@Injectable({ providedIn: 'root' })
export class TasksService {
  async getTasks(owner: string, token: string): Promise<Task[]> {
    const response = await axios.get<Task[]>(
      `${environment.tasksBaseUrl}${TASKS_PATH}?owner=${encodeURIComponent(owner)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }

  getErrorMessage(error: unknown): string {
    if (axios.isAxiosError<TaskErrorResponse>(error)) {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string' && detail) {
        return detail;
      }
      if (error.message) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }
    return TASKS_LOAD_ERROR;
  }
}
