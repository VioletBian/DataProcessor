import React, {useCallback, useMemo, useRef, useState} from "react";
import {useHistory} from "react-router-dom";
import {ListGroup, ListGroupItem} from "@gs-ux-uitoolkit-react/list-group";
import {DragAndDropStateUpdateEvent} from "@gs-ux-uitoolkit-react/drag-and-drop";
import {Text, H3, P, H4} from "@gs-ux-uitoolkit-react/text";
import {Button, ButtonGroup} from "@gs-ux-uitoolkit-react/button";
import {Icon, materialDeleteForeverFill, materialIndeterminateQuestionBoxFill} from "@gs-ux-uitoolkit-react/icon";
import HeaderComponent from "../../../components/HeaderComponent";
import {Container, Row, Col, OverlayContainer} from "@gs-ux-uitoolkit-react/layout";

import {Input, Textarea} from "@gs-ux-uitoolkit-react/input";
import {Alert} from "@gs-ux-uitoolkit-react/alert";
import JsonView from "react18-json-view";

import BreadcrumbComponent from "../../../components/BreadcrumbComponent";
import SidePanelComponent from "../../../components/DataProcessorComponent/Navigation/Sider";
import {Select, SelectOption, SelectRefMethods} from "@gs-ux-uitoolkit-react/select";
import {Collapse} from "@gs-ux-uitoolkit-react/collapse";
import {Tooltip} from "@gs-ux-uitoolkit-react/tooltip";
import {
  AggregateAction,
  OperatorMeta,
  OPERATOR_META, OPERATOR_PARAM_META_CONFIG, OperatorParamMap,
  OperatorType, ParamMeta
} from "./MetaData";
import {FormGroup, FormControl, Form} from "@gs-ux-uitoolkit-react/form";
import {Separator} from "@gs-ux-uitoolkit-react/separator";
import {Param} from "../../components/DataProcessorComponent/Param/Param";

interface PipelineStep<T extends OperatorType = OperatorType> {
  id: string;
  type: T;
  label: string;
  params: OperatorParamMap[T];
}

const operator_rows: OperatorType[][] = [
  ["filter", "sort", "aggregate"],
  ["tag", "col_apply", "col_assign"],
  ["constant", "value_mapping", "formatter"]
];

const createId = (): string => `step-${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;

function createStep<T extends OperatorType>(type: T): PipelineStep<T> {
  const meta: Record<OperatorType, OperatorMeta> = OPERATOR_META as any;
  return {
    id: createId(),
    type,
    label: meta[type].title,
    params: {} as OperatorParamMap[T]
  };
}

interface StringListInputProps {
  label: string;
  value: string[];
  description: string;
  placeholder?: string;
  helperText?: string;
  onChange: (value: string[]) => void;
}

interface OperatorFormProps {
  step: PipelineStep | null;
  onChange: (step: PipelineStep) => void;
  columns?: string[]; // 传入已识别的列名
}

const OperatorForm: React.FC<OperatorFormProps> = ({step, onChange, columns}) => {
  if (!step) {
    return (
      <Container className="pjg-empty-state">
        {/*Add an operator to start*/}
      </Container>
    );
  }

  const setParams = (nextParams: any): void => {
    onChange({...step, params: nextParams});
  };

  const params = step.params as any;

  const currentParamMeta = OPERATOR_PARAM_META_CONFIG[step.type];
  const paramKeys: string[] = Object.keys(currentParamMeta);
  return (
    <Container>
      {paramKeys.map((key: string) => (
        <Param
          key={String(key as any)}
          operatorType={step.type as any}
          paramKey={key as any}
          value={(params as any)?.[key]}
          allValues={params || {}}
          onChange={(newVal: any): void => {
            setParams({
              ...params,
              [key]: newVal
            });
          }}
        />
      ))}
    </Container>
  );
};

function reorderSteps(
  prev: PipelineStep[],
  result: DragAndDropStateUpdateEvent
): PipelineStep[] {
  const {source, destination} = result;
  if (!destination) return prev;
  if (source.index === destination.index) {
    return prev;
  }
  const list: PipelineStep<OperatorType>[] = [...prev];
  const [moved] = list.splice(source.index, 1);
  list.splice(destination.index, 0, moved);
  return list;
}

// 接收外部传入的状态，使其成为受控组件
interface PipelineJsonGeneratorProps {
  steps?: PipelineStep<OperatorType>[];
  onStepsChange?: (steps: PipelineStep<OperatorType>[]) => void;
  columns?: string[]; // 传入已识别的列名
}

export const PipelineJsonGenerator: React.FC<PipelineJsonGeneratorProps> = ({
  steps: externalSteps,
  onStepsChange,
  columns = []
}) => {
  // 使用内部状态如果外部没传，否则同步外部状态
  const [internalSteps, setInternalSteps] = useState<PipelineStep<OperatorType>[]>([]);
  
  // 衍生的当前步骤
  const steps = externalSteps || internalSteps;

  // 包装一下 setSteps，兼容受控和非受控
  const updateSteps = (newStepsOrUpdater: any) => {
    let newSteps;
    if (typeof newStepsOrUpdater === 'function') {
        newSteps = newStepsOrUpdater(steps);
    } else {
        newSteps = newStepsOrUpdater;
    }

    if (onStepsChange) {
        onStepsChange(newSteps);
    } else {
        setInternalSteps(newSteps);
    }
  };

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<OperatorType | undefined>(undefined);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const selectedStep: PipelineStep<OperatorType> | null = useMemo(
    () => steps.find((step: PipelineStep<OperatorType>) => step.id === selectedStepId) || null,
    [selectedStepId, steps],
  );

  const handleDragUpdate = React.useCallback(
    (result: DragAndDropStateUpdateEvent): void => {
      updateSteps((prev: PipelineStep<OperatorType>[]) => reorderSteps(prev, result));
    },
    [onStepsChange]
  );

  const handleAddStep = (type: OperatorType): void => {
    const newStep: PipelineStep = createStep(type);
    updateSteps((prev: PipelineStep<OperatorType>[]) => [...prev, newStep]);
    setSelectedStepId(newStep.id);
  };
  
  const handleRemoveStep = (id: string): void => {
      updateSteps((prev: PipelineStep<OperatorType>[]) => prev.filter((step: PipelineStep<OperatorType>) => step.id !== id));
      if (selectedStepId === id) {
        setSelectedStepId(() => null);
      }
  };

  const moveStep = (id: string, direction: "up" | "down"): void => {
      updateSteps((prev: PipelineStep<OperatorType>[]) => {
          // Copy existing logic
          const index: number = prev.findIndex((step: PipelineStep<OperatorType>) => step.id === id);
          if (index === -1) return prev;
          const newIndex: number = direction === "up" ? index - 1 : index + 1;
          if (newIndex < 0 || newIndex >= prev.length) return prev;
          const next: PipelineStep<OperatorType>[] = [...prev];
          const [moved] = next.splice(index, 1);
          next.splice(newIndex, 0, moved);
          return next;
    });
  };

  const handleStepChange = (updated: PipelineStep): void => {
    updateSteps((prev: PipelineStep<OperatorType>[]) => prev.map((step: PipelineStep<OperatorType>) => (step.id === updated.id ? updated : step)));
  };
  
  const toggleExpand = (id: string): void => {
    setExpandedIds((prev: string[]) => {
      if (prev.includes(id)) {
        return prev.filter((item: string) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const OperatorListItem = ({step, index}: { step: PipelineStep<OperatorType>, index: number }) => {
    const expanded: boolean = expandedIds.includes(step.id);
    return (
      <ListGroupItem
        key={step.id}
        onClick={() => {
          setSelectedStepId(step.id);
          setSelectedType(undefined);
        }}
        selected={step.id === selectedStepId}
        draggableConfig={{
          index: index,
          draggableId: step.id,
          // disabled: id === '2',
          disabled: false,
          iconPlacement: "center",
          iconPosition: "leading",
          grabArea: "icon",
          dragIconVisibility: "visible",
        }}
      >
        <div
          onClick={() => {
            toggleExpand(step.id);
          }}
          aria-expanded={expanded}
        >
          <Row>
            <Col xs={8} lg={8}>
              <H4 style={{textAlign: "left"}}>{index + 1}. {step.label}</H4>
              <P style={{textAlign: "left"}}>{step.type}</P>
            </Col>
            <Col xs={4} lg={4}>
              <div style={{textAlign: "right"}}>
                <ButtonGroup>
                  <Button size={"small"} emphasis={"subtle"} disabled={index === 0} onClick={(event) => {
                    event.stopPropagation();
                    moveStep(step.id, "up");
                  }}>Up</Button>
                  <Button size={"small"} emphasis={"subtle"} disabled={index === steps.length - 1} onClick={(event) => {
                    event.stopPropagation();
                    moveStep(step.id, "down");
                  }}>Down</Button>
                  <Button size={"small"} emphasis={"subtle"} onClick={(event) => {
                    event.stopPropagation();
                    handleRemoveStep(step.id);
                  }}>
                    <Icon svg={materialDeleteForeverFill} />
                  </Button>
                </ButtonGroup>
              </div>
            </Col>
          </Row>
        </div>
        <Collapse in={expanded}>
          <OperatorForm step={step} onChange={handleStepChange} columns={columns} />
        </Collapse>
      </ListGroupItem>
    );
  };

  return (
    <div style={{padding: "0 0 0 0"}}>
      <div style={{display: "flex"}}>
        <Container className="pjg-generator" style={{width: "100%", padding: 10}}>
          {/** Replace HeaderComponent usage inside drawer if any */}
          
          <ListGroup dragAndDrop={true} id={"operator-list-group"} onStateUpdate={handleDragUpdate}>
            {steps.map((step: PipelineStep<OperatorType>, index: number) => (
              <div key={step.id}>
                <OperatorListItem step={step} index={index}/>
              </div>
            ))}
          </ListGroup>
           
           <Separator style={{margin: "20px 0"}}/>
           
           {/* Add Buttons area */}
           <Form style={{marginBottom:"50px"}}>
               {/* 简化布局以适应 Drawer 宽度 */}
                <Row>
                     <H3>Add Operator</H3>
                </Row>
                <Row>
                    <Select options={Object.values(OPERATOR_META).map((item: OperatorMeta) => ({
                      value: item.type,
                      label: item.title
                    }))}
                    style={{width: "80%"}}
                    placeholder={"select operator type"}
                    onChange={(event: any) => setSelectedType(event.selectedValue as OperatorType)}
                    />
                    <Button disabled={!selectedType} onClick={() => {
                      if (selectedType) {
                        handleAddStep(selectedType as OperatorType);
                      }
                    }}>Add</Button>
                </Row>
                {operator_rows.map((row: OperatorType[], rowIndex: number) => (
                  <Row key={rowIndex}>
                    {row.map((type: OperatorType, colIndex: number) => {
                      const meta: OperatorMeta = OPERATOR_META[type];
                      return (
                        <Col xs={4} lg={6} key={colIndex}>
                          <Button style={{width: "90%"}} emphasis={"subtle"} type={"button"} onClick={() => handleAddStep(type)}>{meta.title}</Button>
                        </Col>
                      );
                    })}
                  </Row>
                ))}
           </Form>

        </Container>
        {/* Remove Right Column (JsonView and Buttons) from here, display logic moves to Parent */}
      </div>
    </div>
  );
};

export default PipelineJsonGenerator;
