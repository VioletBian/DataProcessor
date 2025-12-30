import {
  AGGREGATE_ACTION_META_CONFIG,
  AggregateAction,
  AggregateActionKey,
  OPERATOR_PARAM_META_CONFIG,
  OperatorParamMap,
  OperatorType,
  ParamMeta,
} from "../../../pages/PipelineJsonGenerator/MetaData";
import { Col, Row } from "@gs-ux-uitoolkit-react/layout";
import { H4, P } from "@gs-ux-uitoolkit-react/text";
import { Tooltip } from "@gs-ux-uitoolkit-react/tooltip";
import { Input } from "@gs-ux-uitoolkit-react/input";
import { useState, useRef } from "react";
import { Radio, RadioChangeEvent } from "@gs-ux-uitoolkit-react/radio";
import { Form } from "@gs-ux-uitoolkit-react/form";
import { Select, SelectRefMethods, SelectChangeEvent } from "@gs-ux-uitoolkit-react/select";
import { Button } from "@gs-ux-uitoolkit-react/button";
import MapEditor from "./MapEditor";
import NestedMapEditor from "./NestedMapEditor";

const createId = (): string => `step-${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;

function stringListInputConvert(inputList: string): string[] {
  inputList = inputList.replace("_", ",");
  inputList = inputList.replace("__", ",");
  const list: string[] = inputList.split(",");
  return list;
}

function normalizeCommaSeparated(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
}

function booleanListInputConvert(inputList: string): boolean[] {
  return normalizeCommaSeparated(inputList).map((token: string): boolean => token.toLowerCase() === "true");
}

function booleanListOutputConvert(list: boolean[]): string {
  return list.map((v: boolean) => (v ? "true" : "false")).join(",");
}

function alignWithReferenceList(thisList: any, refList: any): boolean {
  // TODO:
  return false;
}

interface ParamProps<T extends OperatorType> {
  operatorType: T;
  paramKey: keyof OperatorParamMap[T];
  value: any;
  allValues: any;
  onChange: (val: any) => void;
  // subKey?: T extends "aggregate"? AggregateActionKey : never;
}

interface ParamInputProps<T extends OperatorType> {
  meta: ParamMeta<any>;
  value: any;
  allValues: any;
  onChange: (val: any) => void;
  subKey?: T extends "aggregate" ? AggregateActionKey : never;
}

export function ParamInput<T extends OperatorType>(props: ParamInputProps<T>): JSX.Element | null {
  const { meta, value, allValues, onChange, subKey }: ParamInputProps<T> = props;

  switch (meta.uiType) {
    case "string-list":
      return (
        <Input
          style={{ width: "98%" }}
          className="pjg-input"
          value={value}
          placeholder={meta.placeholder}
          helperContent={meta.description}
          required={meta.required}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(stringListInputConvert(e.target.value))}
          onClearClick={() => onChange([])}
          clearable={true}
        />
      );
    case "string":
      return (
        <Input
          style={{ width: "98%" }}
          className="pjg-input"
          value={value}
          placeholder={meta.placeholder}
          helperContent={meta.description}
          required={meta.required}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
          onClearClick={() => onChange("")}
          clearable={true}
        />
      );
    case "mapped-boolean": {
      const referenceList: string[] = allValues[meta.referenceKey] as string[] || [];
      const currentList: any[] = Array.isArray(value) ? value : [];
      const [localText, setLocalText] = useState<string>(() => {
        return booleanListOutputConvert((value as boolean[]) || []);
      });
      return (
        <Input
          style={{ width: "98%" }}
          className="pjg-input"
          value={localText}
          placeholder={meta.placeholder}
          helperContent={meta.description}
          required={meta.required}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
            setLocalText(e.target.value);
          }}
          onBlur={() => {
            onChange(booleanListInputConvert(localText));
          }}
          onClearClick={() => {
            setLocalText("");
          }}
          clearable={true}
        />
      );
    }
    case "mapped-string": {
      const referenceList: string[] = allValues[meta.referenceKey] as string[] || [];
      const currentList: any[] = Array.isArray(value) ? value : [];
      return (
        <Input
          style={{ width: "98%" }}
          className="pjg-input"
          value={value}
          placeholder={meta.placeholder}
          helperContent={meta.description}
          required={meta.required}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
            // TODO: if(alignWithReferenceList(currentList, referenceList)){
            if (meta.uiType == "mapped-boolean") {
              onChange(booleanListInputConvert(e.target.value));
            } else {
              onChange(stringListInputConvert(e.target.value));
            }
            // }else{
            onChange(stringListInputConvert(e.target.value));
            // }
          }}
          clearable={true}
          onClearClick={() => onChange("")}
        />
      );
    }
    case "radio": {
      const options: string[] = meta.options;
      const rationNameId: string = "ratio" + "_" + createId();
      function onRadioChange(event: RadioChangeEvent): void {
        const { value, checked } = event.target as HTMLInputElement;
        console.log(`${value}: ${checked}`);
        onChange(value);
      }
      return (
        <>
          {options.map((option: string, index: number) => {
            return (
              <Radio
                name={rationNameId}
                value={option}
                style={{ marginRight: "5px" }}
                defaultChecked={index == 0}
                onChange={(e: RadioChangeEvent): void => {
                  onRadioChange(e);
                }}
                inline
              >
                {option}
              </Radio>
            );
          })}
        </>
      );
    }
    case "map": {
      return (
        <MapEditor
          value={value}
          onChange={onChange}
          keyPlaceholder="Column name"
          valuePlaceholder="Constant value"
        />
      );
    }
    case "nested-map": {
      return (
        <NestedMapEditor
          value={value}
          onChange={onChange}
          outerKeyPlaceholder="Column name"
          innerKeyPlaceholder="Original value"
          innerValuePlaceholder="Mapped value"
        />
      );
    }
    case "select": {
      const selectRef: React.RefObject<SelectRefMethods> = useRef<SelectRefMethods>(null);
      return (
        <Select
          ref={selectRef}
          options={meta.options}
          style={{ width: "98%" }}
          selectedValue={value ?? ""}
          placeholder={meta.placeholder}
          helperContent={meta.description}
          required={meta.required}
          onChange={(e: SelectChangeEvent): void => {
            onChange(e.selectedValue);
          }}
          appendMenuTo={document.body}
        />
      );
    }
    case "sub-action": {
      const defaultAction: AggregateAction = {
        method: "",
        on: [],
        rename: [],
        summary_output: "grouped",
        summary_label: "",
      };

      const currentAction: AggregateAction = {
        ...defaultAction,
        ...(value || {}),
      };

      const updateField = (field: keyof AggregateAction, newValue: any): void => {
        const nextAction: {
          method: string;
          on: string[];
          rename: string[];
          summary_output: string;
          summary_label: string;
        } = {
          ...currentAction,
          [field]: newValue,
        };
        onChange(nextAction);
      };
      const selectRef: React.RefObject<SelectRefMethods> = useRef<SelectRefMethods>(null);
      const options: string[] = meta.options;
      const rationNameId: string = "mode" + "_" + createId();
      function onRadioChange(event: RadioChangeEvent): void {
        const { value, checked } = event.target as HTMLInputElement;
        console.log(`${value}: ${checked}`);
        updateField("summary_output", value);
      }

      // @ts-ignore
      const subMeta: ParamMeta<any> = AGGREGATE_ACTION_META_CONFIG[subKey];
      switch (subKey) {
        case "method": {
          return (
            <Select
              options={subMeta.options}
              size="sm"
              style={{ width: "30%" }}
              selectedValue={currentAction.method ?? ""}
              helperContent={subMeta.description}
              onChange={(e: SelectChangeEvent): void => {
                updateField("method", e.selectedValue);
              }}
              appendMenuTo={document.body}
            ></Select>
          );
        }
        case "on":
        case "rename":
        case "summary_label": {
          return (
            <Input
              style={{ width: "98%" }}
              className="pjg-input"
              value={(currentAction[subKey] as string) ?? ""}
              required={subMeta.required}
              placeholder={subMeta.placeholder}
              helperContent={subMeta.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                updateField(subKey, stringListInputConvert(e.target.value))
              }
              clearable={true}
              onClearClick={() => updateField(subKey, "")}
            />
          );
        }
        case "summary_output": {
          // style={{display: "flex", alignItems: "center" }}
          return (
            <>
              {options.map((option: string, index: number) => (
                <Radio
                  name={rationNameId}
                  value={option}
                  style={{ marginRight: "5px" }}
                  helperContent={subMeta.description}
                  defaultChecked={index == 0}
                  checked={(currentAction[subKey] as any) == option}
                  onChange={(e: RadioChangeEvent): void => {
                    onRadioChange(e);
                  }}
                  inline
                >
                  {option}
                </Radio>
              ))}
            </>
          );
        }
      }
      return null;
    }
  }
  return null;
}

interface ParamInputRowProps<T extends OperatorType> {
  operatorType: T;
  paramKey: keyof OperatorParamMap[T];
  value: any;
  allValues: any;
  onChange: (val: any) => void;
}

export const Param = <T extends OperatorType>({
  operatorType,
  paramKey,
  value,
  allValues,
  onChange,
}: ParamProps<T>): null | Element => {
  const meta: ParamMeta<any> = OPERATOR_PARAM_META_CONFIG[operatorType][paramKey] as ParamMeta<any>;
  if (!meta) return null;
  const uuidLabelId: string = paramKey.toString() + "_" + createId();

  if (meta.uiType == "sub-action") {
    const keys: (keyof AggregateAction)[] = Object.keys(AGGREGATE_ACTION_META_CONFIG) as AggregateActionKey[];
    return (
      <>
        {/* action title row */}
        <Row className="pjg-string-list-item">
          <Col xs={2} lg={3}>
            <H4 id={uuidLabelId} className="pjg-label">
              {paramKey.toString()}
            </H4>
            <Tooltip target={uuidLabelId}>{meta.helperContent}</Tooltip>
          </Col>
          <Col xs={6} lg={9}></Col>
        </Row>
        {/* loop each sub action meta */}
        {keys.map((subKey: keyof AggregateAction) => {
          const subMeta: ParamMeta<any> = AGGREGATE_ACTION_META_CONFIG[subKey];
          return (
            <Row className="pjg-string-list-item">
              <Col xs={2} lg={3}>
                <P id={subKey as string} className="pjg-label">
                  {subKey}
                </P>
                <Tooltip target={subKey as string}>{subMeta.helperContent}</Tooltip>
              </Col>
              <Col xs={6} lg={9} style={{ display: "flex", alignItems: "center" }}>
                <ParamInput onChange={onChange} value={value} meta={meta} allValues={allValues} subKey={subKey} />
              </Col>
            </Row>
          );
        })}
      </>
    );
  }
  return (
    <Row className="pjg-string-list-item">
      <Col xs={2} lg={3}>
        <P id={uuidLabelId} className="pjg-label">
          {paramKey.toString()}
          {meta.required && <span style={{ color: "red" }}>*</span>}
        </P>
        <Tooltip target={uuidLabelId}>{meta.helperContent}</Tooltip>
      </Col>
      <Col xs={6} lg={9} style={{ display: "flex", alignItems: "center" }}>
        <ParamInput meta={meta} value={value} allValues={allValues} onChange={onChange} />
      </Col>
    </Row>
  );
};
