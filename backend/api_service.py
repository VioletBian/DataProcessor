import io
import json
from typing import List, Dict, Any, Union

import chardet
import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # 新增: 用于定义请求体结构

# 新增: MongoDB 驱动
from motor.motor_asyncio import AsyncIOMotorClient

from src.pipeline import DataPipeline

app = FastAPI()

# --- 数据库配置开始 ---
# 假设 MongoDB 运行在本地默认端口，没有密码
MONGO_URL = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_URL)
db = client["pipeline_db"]  # 数据库名，你可以修改
collection = db["pipelines"] # 集合名
# --- 数据库配置结束 ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

cached_data = None

# --- 新增: Pydantic 模型，用于校验保存接口的输入 ---
class PipelineItem(BaseModel):
    name: str
    pipeline: Union[List[Any], Dict[str, Any]] # pipeline 可以是列表或字典

class APIService:
    @staticmethod
    def publish(data: pd.DataFrame):
        global cached_data
        cached_data = data.to_dict(orient="records")

# --- 新增 API 1: 上传 pipelineName + pipeline Json ---
@app.post("/dp/pipeline/save")
async def save_pipeline(item: PipelineItem):
    """
    保存 Pipeline 配置。
    如果 name 已存在，则返回错误 (Unique constraint)。
    """
    # 1. 检查是否存在同名 pipeline
    existing_doc = await collection.find_one({"name": item.name})
    if existing_doc:
        raise HTTPException(status_code=400, detail=f"Pipeline name '{item.name}' already exists.")
    
    # 2. 构造要存储的数据
    new_doc = item.dict()
    
    # 3. 插入数据库
    result = await collection.insert_one(new_doc)
    
    return {
        "message": "Pipeline saved successfully",
        "name": item.name,
        "id": str(result.inserted_id)
    }

# --- 新增 API 2: 查询 pipelineName ---
@app.get("/dp/pipeline/get")
async def get_pipeline(name: str = Query(..., description="Pipeline name to search")):
    """
    根据名称获取 Pipeline Json。
    目前是精确匹配，未来可扩展为模糊匹配。
    """
    # 1. 精确查找
    doc = await collection.find_one({"name": name})
    
    # --- 未来扩展区域: 相似名称查找 ---
    # if not doc:
    #     # 示例: 使用正则进行模糊查找
    #     doc = await collection.find_one({"name": {"$regex": name, "$options": "i"}})
    # -------------------------------

    if not doc:
        raise HTTPException(status_code=404, detail=f"Pipeline '{name}' not found.")
    
    # 移除 MongoDB 自动生成的 _id 对象，因为它不能直接被 JSON 序列化
    if "_id" in doc:
        del doc["_id"]

    return doc

# --- 原有的运行接口保持不变 ---
@app.post("/dp/pipeline/run")
async def run_pipeline(
    file: UploadFile = File(...),
    pipeline_json: str = Form(...),
):
    print('here we come to /dp/pipeline/run!!!')
    print(pipeline_json)
    
    raw_bytes = await file.read()
    text_stream = io.StringIO(raw_bytes.decode("utf-8"))
    df = pd.read_csv(text_stream)
    print("file df:")
    print(df)

    try:
        spec = json.loads(pipeline_json)
    except json.JSONDecodeError as e:
        print("invalid pipeline_json")
        return {"error":f"invalid pipeline_json:{str(e)}"}
    
    if isinstance(spec, dict) and "pipeline" in spec:
        pipeline_steps = spec['pipeline']
    else:
        pipeline_steps = spec

    try:
        result_df = DataPipeline.run_pipeline(data=df, pipeline=pipeline_steps)
        print("result_df")
        print(result_df)
    except Exception as e:
        return {"error":f"pipeline execution error:{str(e)}"}

    preview_df = result_df
    preview_df = preview_df.replace([np.inf, -np.inf], np.nan)
    preview_df = preview_df.replace(np.nan, None)
    columns = list(preview_df.columns)
    rows: List[Dict[str, Any]] = preview_df.to_dict(orient="records")

    return {
        "columns": columns,
        "rows": rows,
    }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        app="api_service:app",
        host="127.0.0.1",
        port=8003,
        reload=True
    )