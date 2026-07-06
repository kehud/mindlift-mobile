import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'splash',
    loadChildren: () => import('./splash/splash.module').then((m) => m.SplashPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then((m) => m.LoginPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then((m) => m.HomePageModule)
  },
  {
    path: 'workout-setup',
    loadChildren: () => import('./workout-setup/workout-setup.module').then((m) => m.WorkoutSetupPageModule)
  },
  {
    path: 'active-workout',
    loadChildren: () => import('./active-workout/active-workout.module').then((m) => m.ActiveWorkoutPageModule)
  },
  {
    path: 'summary',
    loadChildren: () => import('./summary/summary.module').then((m) => m.SummaryPageModule)
  },
  {
    path: 'history',
    loadChildren: () => import('./history/history.module').then((m) => m.HistoryPageModule)
  },
  {
    path: 'profile-settings',
    loadChildren: () => import('./profile-settings/profile-settings.module').then((m) => m.ProfileSettingsPageModule)
  },
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
