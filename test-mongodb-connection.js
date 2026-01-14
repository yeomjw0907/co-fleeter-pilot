/**
 * MongoDB 연결 테스트 스크립트
 * 로컬에서 MongoDB Atlas 연결을 테스트합니다
 */

const mongoose = require('mongoose');

// 연결 문자열 (환경 변수 또는 직접 입력)
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:admin123!@co-fleeter.lpebgqp.mongodb.net/cofleeter?retryWrites=true&w=majority';

console.log('🔍 MongoDB 연결 테스트 시작...');
console.log('📝 연결 문자열:', MONGO_URI.replace(/:[^:@]+@/, ':****@')); // 비밀번호 숨김

async function testConnection() {
    try {
        console.log('\n1️⃣ MongoDB 연결 시도 중...');
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // 5초 타임아웃
        });
        
        console.log('✅ MongoDB 연결 성공!');
        
        // 데이터베이스 정보 확인
        const db = mongoose.connection.db;
        const adminDb = db.admin();
        
        console.log('\n2️⃣ 데이터베이스 정보 확인 중...');
        const dbList = await adminDb.listDatabases();
        console.log('📊 사용 가능한 데이터베이스:', dbList.databases.map(d => d.name).join(', '));
        
        // 컬렉션 확인
        const collections = await db.listCollections().toArray();
        console.log('📁 컬렉션 목록:', collections.length > 0 ? collections.map(c => c.name).join(', ') : '없음 (새 데이터베이스)');
        
        // GlobalData 모델 테스트
        console.log('\n3️⃣ 데이터 저장/읽기 테스트 중...');
        const GlobalDataSchema = new mongoose.Schema({ key: String, data: mongoose.Schema.Types.Mixed }, { strict: false });
        const GlobalData = mongoose.model('GlobalData', GlobalDataSchema);
        
        // 테스트 데이터 저장
        const testKey = 'test_connection';
        const testData = { message: 'Connection test successful', timestamp: new Date() };
        
        await GlobalData.updateOne(
            { key: testKey },
            { key: testKey, data: testData },
            { upsert: true }
        );
        console.log('✅ 테스트 데이터 저장 성공');
        
        // 테스트 데이터 읽기
        const saved = await GlobalData.findOne({ key: testKey });
        if (saved) {
            console.log('✅ 테스트 데이터 읽기 성공:', saved.data);
        }
        
        // 테스트 데이터 삭제
        await GlobalData.deleteOne({ key: testKey });
        console.log('✅ 테스트 데이터 삭제 완료');
        
        console.log('\n🎉 모든 테스트 통과! MongoDB 연결이 정상적으로 작동합니다.');
        
    } catch (error) {
        console.error('\n❌ 연결 실패:', error.message);
        
        if (error.name === 'MongoServerSelectionError') {
            console.error('\n💡 가능한 원인:');
            console.error('   - 네트워크 접근 설정 확인 (MongoDB Atlas → Network Access → 0.0.0.0/0)');
            console.error('   - 연결 문자열 확인');
            console.error('   - 사용자명/비밀번호 확인');
        }
        
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 연결 종료');
        process.exit(0);
    }
}

testConnection();
