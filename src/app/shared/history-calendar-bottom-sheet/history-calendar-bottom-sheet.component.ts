import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

interface CalendarDay {
  date: Date | null;
  key: string | null;
  count: number;
}

@Component({
  selector: 'app-history-calendar-bottom-sheet',
  templateUrl: './history-calendar-bottom-sheet.component.html',
  styleUrls: ['./history-calendar-bottom-sheet.component.scss'],
  standalone: false,
})
export class HistoryCalendarBottomSheetComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() availableMonths: readonly Date[] = [];
  @Input() workoutCountsByDate: Readonly<Record<string, number>> = {};
  @Input() selectedMonth: Date | null = null;

  @Output() dismissed = new EventEmitter<void>();
  @Output() dateSelected = new EventEmitter<Date>();
  @Output() dateChosen = new EventEmitter<Date>();

  @ViewChild('calendarModal', { read: ElementRef }) private calendarModal?: ElementRef<HTMLIonModalElement>;
  @ViewChild('calendarSurface') private calendarSurface?: ElementRef<HTMLElement>;

  displayedMonth: Date | null = null;
  selectedDate: Date | null = null;
  sheetBreakpoint = 0.74;
  sheetBreakpoints = [0, this.sheetBreakpoint, 0.9];

  private resizeFrame: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['isOpen']?.currentValue && !changes['isOpen'].previousValue)
      || changes['selectedMonth']
    ) {
      this.displayedMonth = this.normalizedMonth(this.selectedMonth ?? this.availableMonths[0] ?? null);
      this.selectedDate = this.firstWorkoutDateInMonth(this.displayedMonth);
    }
  }

  get monthLabel(): string {
    if (!this.displayedMonth) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(this.displayedMonth);
  }

  get calendarDays(): CalendarDay[] {
    if (!this.displayedMonth) {
      return [];
    }

    const firstOfMonth = new Date(
      this.displayedMonth.getFullYear(),
      this.displayedMonth.getMonth(),
      1,
    );
    const lastOfMonth = new Date(
      this.displayedMonth.getFullYear(),
      this.displayedMonth.getMonth() + 1,
      0,
    );
    const days: CalendarDay[] = Array.from({ length: firstOfMonth.getDay() }, () => ({
      date: null,
      key: null,
      count: 0,
    }));

    for (let day = 1; day <= lastOfMonth.getDate(); day += 1) {
      const date = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), day);
      const key = this.toDateKey(date);

      days.push({ date, key, count: this.workoutCountsByDate[key] ?? 0 });
    }

    return days;
  }

  get selectedWorkoutCount(): number {
    return this.selectedDate
      ? this.workoutCountsByDate[this.toDateKey(this.selectedDate)] ?? 0
      : 0;
  }

  get selectedDateLabel(): string {
    if (!this.selectedDate) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(this.selectedDate);
  }

  get canGoToPreviousMonth(): boolean {
    return this.displayedMonthIndex > 0;
  }

  get canGoToNextMonth(): boolean {
    return this.displayedMonthIndex !== -1 && this.displayedMonthIndex < this.months.length - 1;
  }

  previousMonth(): void {
    if (this.canGoToPreviousMonth) {
      this.displayedMonth = new Date(this.months[this.displayedMonthIndex - 1]);
      this.scheduleContentFit();
    }
  }

  nextMonth(): void {
    if (this.canGoToNextMonth) {
      this.displayedMonth = new Date(this.months[this.displayedMonthIndex + 1]);
      this.scheduleContentFit();
    }
  }

  fitToContent(): void {
    this.scheduleContentFit();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.isOpen) {
      this.scheduleContentFit();
    }
  }

  selectDay(day: CalendarDay): void {
    if (!day.date || day.count === 0) {
      return;
    }

    this.selectedDate = new Date(day.date);
    this.dateSelected.emit(new Date(day.date));
  }

  chooseSelectedDate(): void {
    if (this.selectedDate && this.selectedWorkoutCount > 0) {
      this.dateChosen.emit(new Date(this.selectedDate));
    }
  }

  isSelectedDay(day: CalendarDay): boolean {
    return Boolean(
      day.date
      && this.selectedDate
      && this.toDateKey(day.date) === this.toDateKey(this.selectedDate),
    );
  }

  trackByDay(_: number, day: CalendarDay): string {
    return day.key ?? `blank-${_}`;
  }

  private get months(): Date[] {
    return this.availableMonths
      .map((month) => this.normalizedMonth(month))
      .filter((month): month is Date => month !== null)
      .sort((first, second) => first.getTime() - second.getTime());
  }

  private get displayedMonthIndex(): number {
    if (!this.displayedMonth) {
      return -1;
    }

    return this.months.findIndex((month) => month.getTime() === this.displayedMonth?.getTime());
  }

  private normalizedMonth(date: Date | null): Date | null {
    return date ? new Date(date.getFullYear(), date.getMonth(), 1) : null;
  }

  private scheduleContentFit(): void {
    if (!this.isOpen || this.resizeFrame !== null) {
      return;
    }

    this.resizeFrame = window.requestAnimationFrame(() => {
      this.resizeFrame = window.requestAnimationFrame(() => {
        this.resizeFrame = null;
        this.updateSheetBreakpoint();
      });
    });
  }

  private updateSheetBreakpoint(): void {
    const modal = this.calendarModal?.nativeElement;
    const surface = this.calendarSurface?.nativeElement;

    if (!modal || !surface) {
      return;
    }

    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const contentHeight = surface.scrollHeight + 20;
    const breakpoint = Math.min(Math.max(contentHeight / viewportHeight, 0.5), 0.9);
    const roundedBreakpoint = Math.round(breakpoint * 1000) / 1000;

    if (roundedBreakpoint === this.sheetBreakpoint) {
      return;
    }

    this.sheetBreakpoint = roundedBreakpoint;
    this.sheetBreakpoints = roundedBreakpoint === 0.9
      ? [0, 0.9]
      : [0, roundedBreakpoint, 0.9];

    window.requestAnimationFrame(() => {
      void modal.setCurrentBreakpoint(roundedBreakpoint);
    });
  }

  private firstWorkoutDateInMonth(month: Date | null): Date | null {
    if (!month) {
      return null;
    }

    const prefix = `${month.getFullYear()}-${(month.getMonth() + 1).toString().padStart(2, '0')}-`;
    const firstDateKey = Object.keys(this.workoutCountsByDate)
      .filter((dateKey) => dateKey.startsWith(prefix) && this.workoutCountsByDate[dateKey] > 0)
      .sort()[0];

    if (!firstDateKey) {
      return null;
    }

    const [year, monthNumber, day] = firstDateKey.split('-').map(Number);

    return new Date(year, monthNumber - 1, day);
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
