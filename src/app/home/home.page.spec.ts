import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { OnboardingProfileService } from '../core/onboarding/onboarding-profile.service';

import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser$: of(null),
          } satisfies Pick<AuthService, 'currentUser$'>,
        },
        {
          provide: OnboardingProfileService,
          useValue: {
            loadProfile: jasmine.createSpy('loadProfile').and.resolveTo(null),
          } satisfies Pick<OnboardingProfileService, 'loadProfile'>,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
