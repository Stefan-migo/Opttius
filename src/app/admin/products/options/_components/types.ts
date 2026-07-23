export interface OptionField {
  id: string;
  field_key: string;
  field_label: string;
  field_category: string;
  is_array: boolean;
  is_active: boolean;
  display_order: number;
  values?: OptionValue[];
}

export interface OptionValue {
  id: string;
  field_id: string;
  value: string;
  label: string;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
}
