from flask import Blueprint, request
import pandas as pd
import requests
import os
import uuid
from io import BytesIO
from datetime import datetime
from urllib.parse import quote

from dotenv import load_dotenv

load_dotenv()

analysis_bp = Blueprint("analysis", __name__)

# -----------------------------------------
# Configuration
# -----------------------------------------

UPLOAD_FOLDER = "uploads"

ML_API_URL = (
    "https://chitragupta-ai-api.onrender.com/predict"
)

STORAGE_BUCKET = "csv-uploads"

RAW_REQUIRED_FIELDS = [
    "state",
    "work_category",
    "cost_estimate",
    "implementing_agency",
    "status",
    "payment_released_pct"
]


# -----------------------------------------
# Supabase configuration
# -----------------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_URL or SUPABASE_KEY is missing in .env"
    )


# -----------------------------------------
# Risk level
# -----------------------------------------

def get_risk_level(risk_score):

    if risk_score >= 70:
        return "High"

    elif risk_score >= 30:
        return "Medium"

    else:
        return "Low"


# -----------------------------------------
# Test route
# -----------------------------------------

@analysis_bp.route("/test", methods=["GET"])
def test():

    return {
        "message": "Analysis API is working"
    }


# -----------------------------------------
# CSV Upload + Storage + ML Analysis
# -----------------------------------------

@analysis_bp.route("/upload-csv", methods=["POST"])
def upload_csv():

    try:

        # =====================================
        # 1. Check file
        # =====================================

        if "file" not in request.files:

            return {
                "error": "No CSV file uploaded"
            }, 400

        file = request.files["file"]

        if file.filename == "":

            return {
                "error": "No file selected"
            }, 400

        if not file.filename.lower().endswith(".csv"):

            return {
                "error": "Only CSV files are allowed"
            }, 400


        # =====================================
        # 2. Read file
        # =====================================

        file_bytes = file.read()

        if not file_bytes:

            return {
                "error": "Uploaded CSV file is empty"
            }, 400


        # =====================================
        # 3. Read CSV
        # =====================================

        df = pd.read_csv(
            BytesIO(file_bytes)
        )

        # Remove completely blank rows
        df = df.dropna(how="all")


        # =====================================
        # 4. Validate columns
        # =====================================

        missing_columns = [
            column
            for column in RAW_REQUIRED_FIELDS
            if column not in df.columns
        ]

        if missing_columns:

            return {
                "error": "Missing required columns",
                "missing": missing_columns
            }, 400


        # =====================================
        # 5. Generate unique filename
        # =====================================

        original_filename = file.filename

        timestamp = datetime.utcnow().strftime(
            "%Y%m%d_%H%M%S"
        )

        unique_id = uuid.uuid4().hex

        safe_filename = (
            f"{timestamp}_"
            f"{unique_id}_"
            f"{original_filename}"
        )

        storage_path = (
            f"uploads/{safe_filename}"
        )


        # =====================================
        # 6. Upload to Supabase Storage
        #    Using REST API
        # =====================================

        encoded_path = quote(
            storage_path,
            safe="/"
        )

        storage_url = (
            f"{SUPABASE_URL}"
            f"/storage/v1/object/"
            f"{STORAGE_BUCKET}/"
            f"{encoded_path}"
        )

        storage_headers = {

            "Authorization":
                f"Bearer {SUPABASE_KEY}",

            "apikey":
                SUPABASE_KEY,

            "Content-Type":
                "text/csv"
        }

        print("SUPABASE URL:", SUPABASE_URL)
        print("STORAGE BUCKET:", STORAGE_BUCKET)
        print("STORAGE PATH:", storage_path)
        print("FULL STORAGE URL:", storage_url)


        storage_response = requests.post(
            storage_url,
            headers=storage_headers,
            data=file_bytes,
            timeout=60
        )

        print("SUPABASE STATUS:", storage_response.status_code)
        print("SUPABASE RESPONSE:", storage_response.text)


        # =====================================
        # 7. Check Storage upload
        # =====================================

        if storage_response.status_code not in (200, 201):

            return {
                "error": "Supabase Storage upload failed",
                "status_code": storage_response.status_code,
                "details": storage_response.text
            }, 500


        # =====================================
        # 8. Save local copy
        # =====================================

        os.makedirs(
            UPLOAD_FOLDER,
            exist_ok=True
        )

        local_file_path = os.path.join(
            UPLOAD_FOLDER,
            safe_filename
        )

        with open(
            local_file_path,
            "wb"
        ) as saved_file:

            saved_file.write(file_bytes)


        # =====================================
        # 9. ML Analysis
        # =====================================

        results = []


        for index, row in df.iterrows():

            raw_data = row.to_dict()


            # ---------------------------------
            # Check missing values
            # ---------------------------------

            required_nulls = []

            for field in RAW_REQUIRED_FIELDS:

                if pd.isna(
                    raw_data[field]
                ):

                    required_nulls.append(
                        field
                    )


            # ---------------------------------
            # Invalid row
            # ---------------------------------

            if required_nulls:

                results.append({

                    "work_id":
                        raw_data.get(
                            "work_id",
                            int(index)
                        ),

                    "is_anomaly":
                        None,

                    "risk_score":
                        None,

                    "risk_level":
                        "Invalid",

                    "error":
                        "Required value is missing",

                    "missing_fields":
                        required_nulls

                })

                continue


            # ---------------------------------
            # Prepare ML data
            # ---------------------------------

            ml_data = {

                "state":
                    str(
                        raw_data["state"]
                    ),

                "work_category":
                    str(
                        raw_data["work_category"]
                    ),

                "cost_estimate":
                    float(
                        raw_data["cost_estimate"]
                    ),

                "implementing_agency":
                    str(
                        raw_data[
                            "implementing_agency"
                        ]
                    ),

                "status":
                    str(
                        raw_data["status"]
                    ),

                "payment_released_pct":
                    float(
                        raw_data[
                            "payment_released_pct"
                        ]
                    )

            }


            # ---------------------------------
            # Optional completion_days
            # ---------------------------------

            if (
                "completion_days" in raw_data
                and pd.notna(
                    raw_data["completion_days"]
                )
            ):

                ml_data[
                    "completion_days"
                ] = float(
                    raw_data["completion_days"]
                )


            # ---------------------------------
            # Call ML API
            # ---------------------------------

            try:

                response = requests.post(

                    ML_API_URL,

                    json=ml_data,

                    timeout=60

                )


                # -----------------------------
                # ML error
                # -----------------------------

                if response.status_code != 200:

                    results.append({

                        "work_id":
                            raw_data.get(
                                "work_id",
                                int(index)
                            ),

                        "is_anomaly":
                            None,

                        "risk_score":
                            None,

                        "risk_level":
                            "Error",

                        "error":
                            "ML API prediction failed",

                        "details":
                            response.text

                    })

                    continue


                # -----------------------------
                # Prediction
                # -----------------------------

                prediction = response.json()


                raw_score = float(
                    prediction.get(
                        "risk_score",
                        0
                    ) or 0
                )

                # Rescale ML API risk score from [-20, 20] to [0, 100] for display
                risk_score = max(0.0, min(100.0, (raw_score + 20.0) * 2.5))


                is_anomaly = bool(
                    prediction.get(
                        "is_anomaly",
                        False
                    )
                )


                risk_level = get_risk_level(
                    risk_score
                )


                results.append({

                    "work_id":
                        raw_data.get(
                            "work_id",
                            int(index)
                        ),

                    "is_anomaly":
                        is_anomaly,

                    "risk_score":
                        round(
                            risk_score,
                            2
                        ),

                    "risk_level":
                        risk_level,

                    "engineered_features":
                        prediction.get(
                            "engineered_features",
                            {}
                        )

                })


            except requests.exceptions.RequestException as e:

                results.append({

                    "work_id":
                        raw_data.get(
                            "work_id",
                            int(index)
                        ),

                    "is_anomaly":
                        None,

                    "risk_score":
                        None,

                    "risk_level":
                        "Error",

                    "error":
                        "Could not connect to ML API",

                    "details":
                        str(e)

                })


        # =====================================
        # 10. Summary
        # =====================================

        total_records = len(results)


        anomaly_count = sum(

            1

            for result in results

            if result[
                "is_anomaly"
            ] is True

        )


        invalid_count = sum(

            1

            for result in results

            if result[
                "risk_level"
            ] == "Invalid"

        )


        error_count = sum(

            1

            for result in results

            if result[
                "risk_level"
            ] == "Error"

        )


        normal_count = (

            total_records
            - anomaly_count
            - invalid_count
            - error_count

        )


        # =====================================
        # 11. Final response
        # =====================================

        return {

            "status":
                "success",

            "message":
                "CSV uploaded and analyzed successfully",

            "filename":
                original_filename,

            "storage_path":
                storage_path,

            "total_records":
                total_records,

            "anomalies":
                anomaly_count,

            "normal_records":
                normal_count,

            "invalid_records":
                invalid_count,

            "error_records":
                error_count,

            "results":
                results

        }


    # =========================================
    # General error
    # =========================================

    except Exception as e:

        return {

            "error":
                str(e)

        }, 500