import {
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import React, {useState, useEffect} from 'react';
import {Layout, Text, Input, Button, Icon} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {db} from '../../firebase';
import {PageLoader} from './PageLoader';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDispatch} from 'react-redux';
import {login} from '../reducers';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import auth from '@react-native-firebase/auth';
//import {auth} from '../../config/firebase';
import {sendPasswordResetEmail} from 'firebase/auth';
const firebaseConfig = {
  apiKey: 'AIzaSyBEaodLg-dWm-Hp_izwzhCn_ndP0WKZa7A',
  authDomain: 'vigilanceai.firebaseapp.com',
  projectId: 'vigilanceai',
  storageBucket: 'vigilanceai.appspot.com',
  messagingSenderId: '745944856196',
  appId: '1:745944856196:web:68d5d90a2307f4ed2634d1',
};
let app;
if (firebase.apps.length === 0) {
  app = firebase.initializeApp(firebaseConfig);
} else {
  app = firebase.app();
}
const PForgotPwd = () => {
  const navigation = useNavigation();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '745944856196-j93km6d0o582pa875fl5s0m1vv3m72ev.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const forgotPassword = email => {
    console.log('reset email sent to ' + email);
    sendPasswordResetEmail(email, null)
      .then(() => {
        alert('reset email sent to ' + email);
      })
      .catch(function (e) {
        console.log(e);
      });
  };
  const onPressLogin = () => {
    setLoading(true);
    if (email.length <= 0 || password.length <= 0) {
      setLoading(false);
      Alert.alert('Please fill out the required fields.');
      return;
    }
    firebase
      .auth()
      .signInWithEmailAndPassword(email.trim(), password)
      .then(response => {
        const user_uid = response.user.uid;
        db.collection('usersCollections')
          .doc(user_uid)
          .get()
          .then(function (user) {
            if (user.exists) {
              AsyncStorage.setItem('@loggedInUserID:id', user_uid);
              AsyncStorage.setItem('@loggedInUserID:email', email);
              AsyncStorage.setItem('@loggedInUserID:password', password);
              AsyncStorage.setItem('@loggedInUserID:role', user.data().role);
              AsyncStorage.setItem('@loggedInUserID:onboarded', 'true');
              var userdetails = {
                ...user.data(),
                id: user_uid,
                doctor: user.data().myDoctor,
              };
              dispatch(login(userdetails));
              navigation.navigate('BottomNavigator');
            } else {
              setLoading(false);
              Alert.alert('User does not exist. Please try again.');
            }
          })
          .catch(function (error) {
            setLoading(false);
            const {message} = error;
            Alert.alert(message);
          });
      })
      .catch(error => {
        setLoading(false);
        const {message} = error;
        switch (error.code) {
          case 'auth/invalid-email':
            Alert.alert('Invalid email address');
            break;
          case 'auth/wrong-password':
            Alert.alert('Wrong password. Please try again.');
            break;
          case 'auth/user-not-found':
            Alert.alert(
              'User not found. Please check your email or create an account.',
            );
            break;
          case 'auth/user-disabled':
          case 'user-disabled':
            Alert.alert('User disabled. Please contact support.');
            break;
          default:
            Alert.alert(message);
            break;
        }
      });
  };
  const onPressGoogle = () => {
    GoogleSignin.signIn()
      .then(data => {
        const credential = firebase.auth.GoogleAuthProvider.credential(
          data.idToken,
        );
        const accessToken = data.idToken;
        AsyncStorage.setItem(
          '@loggedInUserID:googleCredentialAccessToken',
          accessToken,
        );
        return firebase.auth().signInWithCredential(credential);
      })
      .then(result => {
        var user = result.user;
        AsyncStorage.setItem('@loggedInUserID:id', user.uid);
        db.collection('usersCollections')
          .doc(user.uid)
          .get()
          .then(function (doc) {
            if (doc.exists) {
              var userDict = {
                id: user.uid,
                email: doc.data().email,
                photoURL: doc.data().photoURL,
                fullname: doc.data().fullname,
                role: doc.data().role,
                dob: doc.data().dob,
                phone: doc.data().phone,
                gender: doc.data().gender,
                newMessages: doc.data().newMessages,
                doctor: doc.data().myDoctor,
              };
              AsyncStorage.setItem('@loggedInUserID:id', user.uid);
              AsyncStorage.setItem('@loggedInUserID:email', doc.data().email);
              AsyncStorage.setItem('@loggedInUserID:role', doc.data().role);
              AsyncStorage.setItem('@loggedInUserID:onboarded', 'true');
              if (doc.data().role !== 'patient') {
                Alert.alert(
                  'You are not authorized to access this app. This app is only for patients.',
                ).then(() => {
                  navigation.navigate('AuthStack', {screen: 'Login'});
                });
              } else {
                dispatch(login(userDict));
                navigation.navigate('BottomNavigator');
              }
            } else {
              var userDict = {
                id: user.uid,
                fullname: user.displayName,
                email: user.email,
                role: 'patient',
                photoURL: user.photoURL,
              };
              var data = {
                ...userDict,
                appIdentifier: 'rn-android-universal-listings',
              };
              db.collection('usersCollections').doc(user.uid).set(data);
              dispatch(login(userDict));
              navigation.navigate('AuthStack', {screen: 'SelectDoctor'});
            }
          })
          .catch(function (error) {
            console.log(error);
          })
          .finally(() => {
            setLoading(false);
          });
      })
      .catch(error => {
        const {message} = error;
        switch (error.code) {
          case 'auth/invalid-email':
            Alert.alert('Invalid email address');
            break;
          case 'auth/wrong-password':
            Alert.alert('Wrong password. Please try again.');
            break;
          case 'auth/user-not-found':
            Alert.alert(
              'User not found. Please check your email or create an account.',
            );
            break;
          case 'auth/user-disabled':
          case 'user-disabled':
            Alert.alert('User disabled. Please contact support.');
            break;
          default:
            Alert.alert(message);
            break;
        }
        setLoading(false);
      });
  };
  return loading ? (
    <PageLoader />
  ) : (
    <SafeAreaView>
      <Layout style={styles.MainContainer}>
        <Layout style={styles.MainHeader}>
          <Icon
            style={styles.Arrow}
            fill="#0075A9"
            name="arrow-back"
            onPress={() => navigation.navigate('Login')}
          />
          <Image
            style={styles.image}
            source={require('../../assets/VigilanceAI_logo.png')}
            resizeMode="contain"
          />
          <Text style={styles.heading}>
            Forgot Your <Text style={styles.Vigilance}>Password</Text>
          </Text>
          <Text style={styles.paragraph}>
            Please Enter your Email address to Reset your Password. Link will be
            sent to your Registered Mail Id.
          </Text>
          <Text style={styles.inputHeading}>Enter your Email Address</Text>
          <Input
            placeholder="Email"
            value={email}
            onChangeText={nextValue => setEmail(nextValue)}
            size="large"
            autoCapitalize="none"
            style={styles.input}
          />

          <Button
            onPress={() => forgotPassword()}
            style={styles.button}
            size="giant">
            Send Link to Email
          </Button>
        </Layout>
      </Layout>
    </SafeAreaView>
  );
};
export default PForgotPwd;
const styles = StyleSheet.create({
  MainContainer: {
    height: '100%',
  },
  MainHeader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginHorizontal: 20,
    marginTop: 25,
  },
  Arrow: {
    width: 30,
    height: 30,
    left: -150,
  },
  Vigilance: {
    fontFamily: 'Recoleta-Bold',
    color: '#0075A9',
    fontSize: 22,
  },
  inputHeading: {
    fontFamily: 'Recoleta-Medium',
    marginTop: 30,
    marginBottom: -3,
    color: '#0075A9',
    left: -70,
  },
  image: {
    height: 130,
    width: 100,
    aspectRatio: 1,
    marginTop: 5,
  },
  heading: {
    marginTop: 20,
    fontSize: 22,
    fontFamily: 'Recoleta-Bold',
  },
  paragraph: {
    fontSize: 16,
    marginTop: 20,
    color: '#C1C1C1',
    fontFamily: 'GTWalsheimPro-Regular',
    justifyContent: 'center',
    textAlign: 'center',
  },
  input: {
    marginTop: 20,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#0075A9',
    width: 330,
    borderColor: 'transparent',
    fontFamily: 'GTWalsheimPro-Regular',
  },
});
