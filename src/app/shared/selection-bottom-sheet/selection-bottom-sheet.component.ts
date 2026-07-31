import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface SelectionBottomSheetOption {
  readonly label: string;
  readonly value: string | number;
}

@Component({
  selector: 'app-selection-bottom-sheet',
  templateUrl: './selection-bottom-sheet.component.html',
  styleUrls: ['./selection-bottom-sheet.component.scss'],
  standalone: false,
})
export class SelectionBottomSheetComponent {
  @Input() fieldTitle = '';
  @Input() isOpen = false;
  @Input() options: readonly SelectionBottomSheetOption[] = [];
  @Input() selectedValue: string | number | null = null;

  @Output() dismissed = new EventEmitter<void>();
  @Output() optionSelected = new EventEmitter<string | number>();

  selectOption(option: SelectionBottomSheetOption): void {
    this.optionSelected.emit(option.value);
  }

  isSelected(option: SelectionBottomSheetOption): boolean {
    return option.value === this.selectedValue;
  }
}
