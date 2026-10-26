import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { formatTaskLabel } from '../utils/legacy-format';
import type { AuthUser } from '../models/auth.models';
import type { Task } from '../models/task.models';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';

const ARCHIVED_STATUS = 'ARCHIVED';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  tasks: Task[] = [];
  visibleTasks: Task[] = [];
  user: AuthUser | null = null;
  loading = true;
  error = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private session: SessionService,
    private tasksService: TasksService
  ) {}

  statusLabel(status: string | undefined): string {
    if (!status) {
      return '';
    }
    return STATUS_LABELS[status.toUpperCase()] || status;
  }

  async ngOnInit(): Promise<void> {
    const token = this.session.getToken();
    this.user = this.session.getUser();
    if (!token) {
      await this.router.navigate(['/login']);
      return;
    }
    try {
      const tasks = await this.tasksService.getTasks(this.user?.username || '', token);
      const visibleTasks: Task[] = [];
      for (const task of tasks) {
        if (task.status === ARCHIVED_STATUS) {
          continue;
        }
        task.label = formatTaskLabel(task);
        visibleTasks.push(task);
      }
      visibleTasks.sort(compareTaskPriorityDescending);
      // axios resuelve a veces fuera de la zona de Angular (más aún llegando
      // por navegación desde el login): forzamos volver a entrar a la zona
      // y disparamos detectChanges a mano para no depender de que Angular
      // lo detecte solo.
      this.zone.run(() => {
        this.tasks = tasks;
        this.visibleTasks = visibleTasks;
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error: unknown) {
      this.zone.run(() => {
        this.error = this.tasksService.getErrorMessage(error);
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async logout(): Promise<void> {
    this.session.clear();
    await this.router.navigate(['/login']);
  }
}

function compareTaskPriorityDescending(left: Task, right: Task): number {
  if (typeof left.priority === 'string' && typeof right.priority === 'string') {
    return left.priority > right.priority ? -1 : 1;
  }
  return Number(left.priority) > Number(right.priority) ? -1 : 1;
}
