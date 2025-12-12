from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class VideoContent(BaseModel):
    fileName: str
    description: Optional[str] = None
    duration: Optional[str] = "10:00"

class ArticleContent(BaseModel):
    html: str

class QuizContent(BaseModel):
    questions: List[Dict[str, Any]]

class LessonCreate(BaseModel):
    title: Optional[str] = ""
    type: Optional[str] = "video"
    content: Optional[Any] = None
    duration: Optional[str] = None


class ModuleCreate(BaseModel):
    title: Optional[str] = ""
    lessons: List[LessonCreate] = []


class CourseCreate(BaseModel):
    title: Optional[str] = ""
    category: Optional[str] = "Development"
    price: float = 0.0
    level: Optional[str] = "Beginner"
    description: Optional[str] = None
    learning_outcomes: Optional[List[str]] = None
    thumbnail_url: Optional[str] = None
    status: Optional[str] = "Draft"
    modules: List[ModuleCreate] = []

