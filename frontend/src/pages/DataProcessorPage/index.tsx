import React, { useState } from 'react';
import BreadcrumbComponent from '../../components/NormalComponent/BreadcrumbComponent';
import { Button } from "@gs-ux-uitoolkit-react/button";
import { Drawer } from "@gs-ux-uitoolkit-react/drawer"; // 假设的 Drawer 库路径
import PipelineJsonGenerator from '../PipelineJsonGenerator';
import { OperatorType } from '../PipelineJsonGenerator/MetaData';
import { PipelineStep } from '../../components/DataProcessorComponent/OperatorForm';
import { Input } from "@gs-ux-uitoolkit-react/input";
import { Alert } from "@gs-ux-uitoolkit-react/alert";
import JSONPreview from '../../components/DataProcessorComponent/JSONPreview';

// Mock Backend API
const mockSaveToMongo = async (name: string, data: any) => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    const saved = localStorage.getItem('mock_mongo_pipelines');
    const pipelines = saved ? JSON.parse(saved) : {};
    
    if (pipelines[name]) {
        throw new Error(`Pipeline with name "${name}" already exists!`);
    }
    
    pipelines[name] = data;
    localStorage.setItem('mock_mongo_pipelines', JSON.stringify(pipelines));
    return { success: true };
};

const mockLoadFromMongo = async (name: string) => {
     await new Promise(resolve => setTimeout(resolve, 500));
     const saved = localStorage.getItem('mock_mongo_pipelines');
     const pipelines = saved ? JSON.parse(saved) : {};
     return pipelines[name] || null;
};


const DataProcessorPage: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  
  // Pipeline Name State
  const [pipelineName, setPipelineName] = useState("");
  const [alertInfo, setAlertInfo] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // 1. CSV 处理逻辑
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          // 简单的取第一行作为表头
          const firstLine = text.split('\n')[0];
          if (firstLine) {
              const cols = firstLine.split(',').map(c => c.trim().replace(/"/g, ''));
              setCsvColumns(cols);
              setAlertInfo({ message: `Loaded ${cols.length} columns from CSV`, type: 'success' });
          }
      };
      reader.readAsText(file);
  };

  // 2. MongoDB 功能
  const handleSave = async () => {
      if (!pipelineName) {
          setAlertInfo({message: "Please enter a pipeline name", type: "error"});
          return;
      }
      try {
          await mockSaveToMongo(pipelineName, pipelineSteps);
          setAlertInfo({message: "Pipeline saved successfully to MongoDB!", type: "success"});
      } catch (e: any) {
          setAlertInfo({message: e.message, type: "error"});
      }
  };

  const handleLoad = async () => {
       if (!pipelineName) {
           // 如果名字为空，理论上应该弹出一个列表选择，这里简化为必须输入名字
          setAlertInfo({message: "Enter a name to load (try saving one first)", type: "error"});
          return;
      }
      try {
          const data = await mockLoadFromMongo(pipelineName);
          if (data) {
              setPipelineSteps(data);
              setAlertInfo({message: `Pipeline "${pipelineName}" loaded!`, type: "success"});
          } else {
              setAlertInfo({message: "Pipeline not found", type: "error"});
          }
      } catch (e: any) {
          setAlertInfo({message: "Load failed", type: "error"});
      }
  };

  return (
    <div style={{ padding: 16 }}>
      <BreadcrumbComponent title="data processor" subTitle="online data processor" />
      
      {alertInfo && (
          <Alert type={alertInfo.type} title={alertInfo.type === 'error' ? 'Error' : 'Success'} style={{marginBottom: 10}}>
              {alertInfo.message}
          </Alert>
      )}

      <div style={{ display: 'grid', gap: 16, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
        
        {/* Step 1: Upload */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
          <p style={{ fontWeight: 700 }}>1. Upload Data Source (CSV)</p>
          <input type="file" multiple accept=".csv" onChange={handleFileUpload} />
          {csvColumns.length > 0 && <span style={{marginLeft: 10, color: 'green'}}>Columns detected: {csvColumns.join(', ')}</span>}
        </div>

        {/* Step 2: Pipeline Config */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
          <p style={{ fontWeight: 700 }}>2. Configure Pipeline</p>
          <div style={{display: 'flex', gap: 10, marginBottom: 10}}>
              <Button onClick={() => setIsDrawerOpen(true)}>Open Pipeline Builder</Button>
              
              <div style={{borderLeft: '1px solid #ccc', paddingLeft: 10, display: 'flex', gap: 5, alignItems: 'center'}}>
                  <Input 
                    value={pipelineName} 
                    onChange={(e) => setPipelineName(e.target.value)} 
                    placeholder="Pipeline Name (e.g. daily_report)"
                    style={{width: 200}}
                   />
                  <Button emphasis="highlight" onClick={handleSave}>Save to Mongo</Button>
                  <Button emphasis="subtle" onClick={handleLoad}>Load</Button>
              </div>
          </div>
          
          <JSONPreview data={{ pipeline: pipelineSteps }} label="Current Pipeline JSON" />
        </div>
      </div>

      {/* 3. Drawer Integration */}
      <Drawer
         visible={isDrawerOpen}
         placement={'right'}
         padding={true}
         appearance={'neutral'}
         emphasis={'subtle'}
         onDismiss={() => setIsDrawerOpen(false)}
         dismissible={true}
         // classes={...} // Add styles if needed according to demo
         style={{width: '600px', maxWidth: '90vw'}} // 确保 Drawer 有宽度
      >
          <div style={{padding: 20}}>
            <h3 style={{marginTop: 0}}>Pipeline Builder</h3>
            <p>Drag, drop and configure your operators here.</p>
            {/* 嵌入 Generator，传入状态和列名 */}
            <PipelineJsonGenerator 
                steps={pipelineSteps} 
                onStepsChange={setPipelineSteps}
                columns={csvColumns}
                operatorTypes={Object.values(OperatorType)}
                // filepath: /Users/fortunebian/Desktop/data-processor/frontend/src/pages/DataProcessorPage/index.tsx
import React, { useState } from 'react';
import BreadcrumbComponent from '../../components/NormalComponent/BreadcrumbComponent';
import { Button } from "@gs-ux-uitoolkit-react/button";
import { Drawer } from "@gs-ux-uitoolkit-react/drawer"; // 假设的 Drawer 库路径
import PipelineJsonGenerator from '../PipelineJsonGenerator';
import { OperatorType } from '../PipelineJsonGenerator/MetaData';
import { PipelineStep } from '../../components/DataProcessorComponent/OperatorForm';
import { Input } from "@gs-ux-uitoolkit-react/input";
import { Alert } from "@gs-ux-uitoolkit-react/alert";
import JSONPreview from '../../components/DataProcessorComponent/JSONPreview';

// Mock Backend API
const mockSaveToMongo = async (name: string, data: any) => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    const saved = localStorage.getItem('mock_mongo_pipelines');
    const pipelines = saved ? JSON.parse(saved) : {};
    
    if (pipelines[name]) {
        throw new Error(`Pipeline with name "${name}" already exists!`);
    }
    
    pipelines[name] = data;
    localStorage.setItem('mock_mongo_pipelines', JSON.stringify(pipelines));
    return { success: true };
};

const mockLoadFromMongo = async (name: string) => {
     await new Promise(resolve => setTimeout(resolve, 500));
     const saved = localStorage.getItem('mock_mongo_pipelines');
     const pipelines = saved ? JSON.parse(saved) : {};
     return pipelines[name] || null;
};


const DataProcessorPage: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  
  // Pipeline Name State
  const [pipelineName, setPipelineName] = useState("");
  const [alertInfo, setAlertInfo] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // 1. CSV 处理逻辑
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          // 简单的取第一行作为表头
          const firstLine = text.split('\n')[0];
          if (firstLine) {
              const cols = firstLine.split(',').map(c => c.trim().replace(/"/g, ''));
              setCsvColumns(cols);
              setAlertInfo({ message: `Loaded ${cols.length} columns from CSV`, type: 'success' });
          }
      };
      reader.readAsText(file);
  };

  // 2. MongoDB 功能
  const handleSave = async () => {
      if (!pipelineName) {
          setAlertInfo({message: "Please enter a pipeline name", type: "error"});
          return;
      }
      try {
          await mockSaveToMongo(pipelineName, pipelineSteps);
          setAlertInfo({message: "Pipeline saved successfully to MongoDB!", type: "success"});
      } catch (e: any) {
          setAlertInfo({message: e.message, type: "error"});
      }
  };

  const handleLoad = async () => {
       if (!pipelineName) {
           // 如果名字为空，理论上应该弹出一个列表选择，这里简化为必须输入名字
          setAlertInfo({message: "Enter a name to load (try saving one first)", type: "error"});
          return;
      }
      try {
          const data = await mockLoadFromMongo(pipelineName);
          if (data) {
              setPipelineSteps(data);
              setAlertInfo({message: `Pipeline "${pipelineName}" loaded!`, type: "success"});
          } else {
              setAlertInfo({message: "Pipeline not found", type: "error"});
          }
      } catch (e: any) {
          setAlertInfo({message: "Load failed", type: "error"});
      }
  };

  return (
    <div style={{ padding: 16 }}>
      <BreadcrumbComponent title="data processor" subTitle="online data processor" />
      
      {alertInfo && (
          <Alert type={alertInfo.type} title={alertInfo.type === 'error' ? 'Error' : 'Success'} style={{marginBottom: 10}}>
              {alertInfo.message}
          </Alert>
      )}

      <div style={{ display: 'grid', gap: 16, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
        
        {/* Step 1: Upload */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
          <p style={{ fontWeight: 700 }}>1. Upload Data Source (CSV)</p>
          <input type="file" multiple accept=".csv" onChange={handleFileUpload} />
          {csvColumns.length > 0 && <span style={{marginLeft: 10, color: 'green'}}>Columns detected: {csvColumns.join(', ')}</span>}
        </div>

        {/* Step 2: Pipeline Config */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
          <p style={{ fontWeight: 700 }}>2. Configure Pipeline</p>
          <div style={{display: 'flex', gap: 10, marginBottom: 10}}>
              <Button onClick={() => setIsDrawerOpen(true)}>Open Pipeline Builder</Button>
              
              <div style={{borderLeft: '1px solid #ccc', paddingLeft: 10, display: 'flex', gap: 5, alignItems: 'center'}}>
                  <Input 
                    value={pipelineName} 
                    onChange={(e) => setPipelineName(e.target.value)} 
                    placeholder="Pipeline Name (e.g. daily_report)"
                    style={{width: 200}}
                   />
                  <Button emphasis="highlight" onClick={handleSave}>Save to Mongo</Button>
                  <Button emphasis="subtle" onClick={handleLoad}>Load</Button>
              </div>
          </div>
          
          <JSONPreview data={{ pipeline: pipelineSteps }} label="Current Pipeline JSON" />
        </div>
      </div>

      {/* 3. Drawer Integration */}
      <Drawer
         visible={isDrawerOpen}
         placement={'right'}
         padding={true}
         appearance={'neutral'}
         emphasis={'subtle'}
         onDismiss={() => setIsDrawerOpen(false)}
         dismissible={true}
         // classes={...} // Add styles if needed according to demo
         style={{width: '600px', maxWidth: '90vw'}} // 确保 Drawer 有宽度
      >
          <div style={{padding: 20}}>
            <h3 style={{marginTop: 0}}>Pipeline Builder</h3>
            <p>Drag, drop and configure your operators here.</p>
            {/* 嵌入 Generator，传入状态和列名 */}
            <PipelineJsonGenerator 
                steps={pipelineSteps} 
                onStepsChange={setPipelineSteps}
                columns={csvColumns}
                operatorTypes={Object.values(OperatorType)}
              />
          </div>
      </Drawer>
    </div>
  );
};

export default DataProcessorPage;
