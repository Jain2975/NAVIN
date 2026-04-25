from loguru import logger
from pathlib import Path
import sys


def setup_logging():
    Path("logs").mkdir(exist_ok=True)
    logger.remove()
    logger.add(
        sys.stdout,
        colorize=True,
        format="<green>{time:HH:mm:ss}</green> | <level>{level:<8}</level> | {message}",
        level="DEBUG",
    )
    logger.add(
        "logs/navin.log",
        rotation="10 MB",
        retention="7 days",
        serialize=True,
        level="INFO",
    )
