from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import io
import os
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

# Configure CORS for production
CORS(app, origins=[
    "https://www.saarthijobs.com",
    "https://saarthijobs.com",
    "https://saarthijobs.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
])

def extract_text_from_pdf(file_bytes):
    """Extract text from PDF bytes"""
    try:
        # Create a BytesIO object from the bytes
        pdf_file = io.BytesIO(file_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + " "
        
        # Clean up the text
        text = ' '.join(text.split())
        return text.strip() if text else None
    except Exception as e:
        logger.error(f"Error extracting PDF: {e}")
        return None

def calculate_similarity(resume_text, job_description):
    """Calculate cosine similarity between resume and job description"""
    try:
        # Handle empty texts
        if not resume_text or not job_description:
            return 0
            
        documents = [resume_text, job_description]
        
        # Create TF-IDF vectors
        tfidf_vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=1000,
            lowercase=True,
            strip_accents='unicode'
        )
        
        tfidf_matrix = tfidf_vectorizer.fit_transform(documents)
        
        # Calculate cosine similarity
        score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
        
        # Convert to percentage and round
        return round(score[0][0] * 100, 2)
    except Exception as e:
        logger.error(f"Error calculating similarity: {e}")
        return 0

@app.route('/api/python-score', methods=['POST', 'OPTIONS'])
def score_resume():
    """Main endpoint for resume scoring"""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    logger.info("🔥 Received request to /api/python-score")
    
    try:
        # Log request details for debugging
        logger.info(f"Files keys: {list(request.files.keys())}")
        logger.info(f"Form keys: {list(request.form.keys())}")
        
        # Check if resume file exists
        if 'resume' not in request.files:
            logger.error("❌ No resume file found")
            return jsonify({
                "success": False, 
                "error": "Missing resume file"
            }), 400
        
        # Check if job description exists
        if 'job_description' not in request.form:
            logger.error("❌ No job description found")
            return jsonify({
                "success": False, 
                "error": "Missing job description"
            }), 400
        
        resume_file = request.files['resume']
        job_description = request.form['job_description']
        
        logger.info(f"✅ Received file: {resume_file.filename}")
        logger.info(f"✅ Job description length: {len(job_description)}")
        
        # Validate file type
        if not resume_file.filename.endswith('.pdf'):
            logger.error(f"❌ Invalid file type: {resume_file.filename}")
            return jsonify({
                "success": False,
                "error": "Please upload a PDF file"
            }), 400
        
        # Read file bytes
        resume_bytes = resume_file.read()
        logger.info(f"✅ Read {len(resume_bytes)} bytes from file")
        
        # Extract text from PDF
        resume_text = extract_text_from_pdf(resume_bytes)
        
        if not resume_text:
            logger.error("❌ Could not extract text from PDF")
            return jsonify({
                "success": False, 
                "error": "Could not extract text from PDF. Please ensure it's a valid text-based PDF (not scanned/image-based)."
            }), 400
        
        logger.info(f"✅ Extracted {len(resume_text)} characters from PDF")
        logger.info(f"Preview: {resume_text[:200]}...")
        
        # Calculate similarity score
        match_score = calculate_similarity(resume_text, job_description)
        logger.info(f"✅ Calculated match score: {match_score}%")
        
        # Return success response
        response = jsonify({
            "success": True,
            "match_percentage": match_score
        })
        
        # Add CORS headers
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Error processing request: {str(e)}")
        import traceback
        traceback.print_exc()
        
        response = jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        })
        response.status_code = 500
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        
        return response

# Health check endpoint
@app.route('/api/python-health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "python-ai",
        "version": "1.0.0"
    })

# This is for Vercel - it will use this app instance
# The variable name 'app' is what Vercel looks for

# For local development
if __name__ == '__main__':
    print("=" * 50)
    print("Starting local Flask server on port 5002...")
    print("=" * 50)
    print("\nRegistered routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.endpoint}: {rule.rule}")
    print("\n" + "=" * 50)
    print("Server will be available at:")
    print("  http://127.0.0.1:5002")
    print("  http://localhost:5002")
    print("=" * 50)
    
    # Run the app
    app.run(debug=True, port=5002, host='0.0.0.0')