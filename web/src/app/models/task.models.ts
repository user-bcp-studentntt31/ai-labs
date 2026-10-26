export interface Task {
  title?: string;
  description?: string;
  owner?: string | number;
  priority?: string | number;
  status?: string;
  label?: string;
}

export interface TaskErrorResponse {
  detail?: string;
}
