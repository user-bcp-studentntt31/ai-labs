import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { LoginCredentials } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { PreferencesService } from '../services/preferences.service';
import type { UserPreferences } from '../services/preferences.service';
import { SessionService } from '../services/session.service';

interface LoginMessage {
  title: string;
  detail?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  busy = false;
  message: LoginMessage | null = null;
  preferences: UserPreferences;

  constructor(
    private router: Router,
    private session: SessionService,
    private authService: AuthService,
    private preferencesService: PreferencesService
  ) {
    this.preferences = this.preferencesService.load();
  }

  async login(): Promise<void> {
    this.message = null;
    if (!this.username.trim()) {
      this.message = { title: 'Ingrese un usuario.' };
      return;
    }
    if (!this.password.trim()) {
      this.message = { title: 'Ingrese una contraseña.' };
      return;
    }

    this.busy = true;
    try {
      const credentials: LoginCredentials = {
        username: this.username,
        password: this.password
      };
      const response = await this.authService.login(credentials);
      if (!response.data.token) {
        this.message = { title: 'El backend respondió sin token.' };
        return;
      }

      this.session.save(response.data.token, response.data.user);
      this.preferencesService.save(this.preferences);
      await this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      this.message = {
        title: `No se pudo autenticar a ${this.username}.`,
        detail: this.authService.getErrorMessage(error)
      };
      console.error(error);
    } finally {
      this.busy = false;
    }
  }
}
