import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from './notification.service';
import { AuthService } from './../../auth/services/auth.service';
import { Inject, Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest
} from '@angular/common/http';
import { from, Observable } from 'rxjs';
import { ProgressBarService } from './progress-bar.service';

@Injectable()
export class InterceptorService implements HttpInterceptor {
    constructor(@Inject('BASE_API_URL') private baseApiUrl: string,
                private progressBarService: ProgressBarService,
                private authService: AuthService,
                private notificationService: NotificationService,
                private activatedRoute: ActivatedRoute,
                private router: Router) {}

    intercept(request: HttpRequest<any>, next: HttpHandler ): Observable<HttpEvent<any>> {
        return from(this.handle(request, next));
    }

    async handle(request: HttpRequest<any>, next: HttpHandler): Promise<HttpEvent<any>> {
        this.progressBarService.show();
        const option = {
            url: `${this.baseApiUrl}/${request.url}`,
            setHeaders: {}
        };
        if (this.authService.isLoggedIn()) {
            const token = await this.authService.getJwtToken();
            option.setHeaders = {
                Authorization: token
            };
        } else {
            const token = this.activatedRoute.snapshot.queryParams.token;
            if (token) {
                option.setHeaders = {
                    Authorization: token
                };
            }
        }
        const api = request.clone(option);
        return next.handle(api)
        .toPromise()
        .catch(({error, status}) => {
            console.error('STATUS CODE: ', status);
            console.error(`ERROR DATA: ${JSON.stringify(error)}`);
            switch (status) {
                case 500:
                    this.notificationService.show('Ocorreu um erro inesperado, por favor, tente mais tarde :/', 'Entendi');
                    return error;
                case 409:
                    throw error;
                default:
                    this.router.navigate(['/login']);
                    break;
            }
        })
        .finally(() => {
            this.progressBarService.hide();
        });
    }
}
