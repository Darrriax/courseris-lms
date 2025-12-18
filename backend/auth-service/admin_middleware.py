"""
Admin middleware for checking system administrator permissions
"""
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if current user is a system administrator"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied. Administrator privileges required."
        )
    
    # Check if user has system_admin permission
    admin_permission = db.execute(
        "SELECT 1 FROM user_permissions up "
        "JOIN permissions p ON up.permission_id = p.id "
        "WHERE up.user_id = :user_id AND p.name = 'system_admin'",
        {"user_id": current_user.id}
    ).fetchone()
    
    if not admin_permission:
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions. System administrator access required."
        )
    
    return current_user


async def check_permission(permission_name: str):
    """Decorator to check specific permission"""
    def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        if current_user.role == "admin":
            # Admins have all permissions
            return current_user
        
        # Check specific permission for non-admin users
        permission = db.execute(
            "SELECT 1 FROM user_permissions up "
            "JOIN permissions p ON up.permission_id = p.id "
            "WHERE up.user_id = :user_id AND p.name = :permission_name",
            {"user_id": current_user.id, "permission_name": permission_name}
        ).fetchone()
        
        if not permission:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied. Required: {permission_name}"
            )
        
        return current_user
    
    return permission_checker
