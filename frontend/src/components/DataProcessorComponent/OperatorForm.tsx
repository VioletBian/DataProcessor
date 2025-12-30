import React from 'react';
import { OPERATOR_META, OPERATOR_PARAM_META_CONFIG, OperatorParamsMap, OperatorType } from '../../pages/PipelineJsonGenerator/MetaData';
import { ParamInput } from './ParamInput';

export interface PipelineStep<T extends OperatorType = OperatorType> {
  id: string;
  type: T;
  label: string;
  params: OperatorParamsMap[T];
}

interface OperatorFormProps {
  step: PipelineStep | null;
  onChange: (step: PipelineStep) => void;
}

export const OperatorForm: React.FC<OperatorFormProps> = ({ step, onChange }) => {
  if (!step) {
    return (
      <div className="pjg-empty-state">
        {/*Add an operator to start*/}
      </div>
    );
  }
  const metaConfig = OPERATOR_META[step.type];
  const setParams = (nextParams: any): void => {
    onChange({ ...step, params: nextParams });
  };
  const params = step.params as any;
  const currentParamMeta = OPERATOR_PARAM_META_CONFIG[step.type];
  const paramKeys: string[] = Object.keys(currentParamMeta);
  return (
    <div>
      {paramKeys.map((key: string) => (
        <ParamInput
          key={String(key as any)}
          operatorType={step.type as any}
          paramKey={key as any}
          value={(params as any)?.[key]}
          allValues={params || {}}
          onChange={(newVal: any): void => {
            setParams((nextParams: any) => ({
              ...params,
              [key]: newVal,
            }));
          }}
        />
      ))}
    </div>
  );
};

export default OperatorForm;
